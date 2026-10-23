import config from '../config/env.js';
import logger from '../utils/logger.js';

class QueueService {
  constructor() {
    this.activeCount = 0;
    this.queue = [];
    this.maxConcurrent = config.concurrency.maxConcurrent;
    this.maxQueueSize = config.concurrency.maxQueueSize;
    this.maxQueueWaitMs = config.concurrency.maxQueueWaitMs;
    this._idleResolvers = [];
  }

  async enqueue(fn, requestId, requestType = 'diagnostic') {
    if (this.activeCount < this.maxConcurrent) {
      return this._runTask(fn, requestId, requestType);
    }

    if (this.queue.length >= this.maxQueueSize) {
      logger.warn('AI_QUEUE_FULL', requestId, {
        activeCount: this.activeCount,
        queueSize: this.queue.length,
        maxQueueSize: this.maxQueueSize,
      });
      const queueFullErr = new Error('VehiCare AI is currently handling several requests. Please try again shortly.');
      queueFullErr.code = 'QUEUE_FULL';
      queueFullErr.status = 429;
      throw queueFullErr;
    }

    const queueStartTime = Date.now();
    logger.info('AI_QUEUE_ENTERED', requestId, {
      queuePosition: this.queue.length + 1,
      activeCount: this.activeCount,
      requestType,
    });

    return new Promise((resolve, reject) => {
      let timeoutId = null;

      const item = {
        requestId,
        requestType,
        fn,
        resolve,
        reject,
        timeoutId,
        cancelled: false,
      };

      timeoutId = setTimeout(() => {
        item.cancelled = true;
        const index = this.queue.indexOf(item);
        if (index !== -1) {
          this.queue.splice(index, 1);
        }

        const waitMs = Date.now() - queueStartTime;
        logger.warn('AI_QUEUE_TIMEOUT', requestId, {
          queueWaitMs: waitMs,
          requestType,
          queueSize: this.queue.length,
        });

        const timeoutErr = new Error('VehiCare AI request timed out waiting in queue. Please try again shortly.');
        timeoutErr.code = 'QUEUE_TIMEOUT';
        timeoutErr.status = 429;
        reject(timeoutErr);
      }, this.maxQueueWaitMs);

      item.timeoutId = timeoutId;
      this.queue.push(item);
    });
  }

  async _runTask(fn, requestId, requestType) {
    this.activeCount++;
    logger.info('AI_QUEUE_STARTED', requestId, {
      activeCount: this.activeCount,
      queueSize: this.queue.length,
      requestType,
    });

    try {
      const res = await fn();
      return res;
    } finally {
      this.activeCount = Math.max(0, this.activeCount - 1);
      this._processQueue();
      if (this.activeCount === 0 && this.queue.length === 0 && this._idleResolvers.length > 0) {
        const resolvers = this._idleResolvers.splice(0);
        resolvers.forEach((resolve) => resolve());
      }
    }
  }

  _processQueue() {
    if (this.activeCount >= this.maxConcurrent) return;
    if (this.queue.length === 0) return;

    while (this.queue.length > 0 && this.activeCount < this.maxConcurrent) {
      const item = this.queue.shift();
      if (!item || item.cancelled) continue;

      clearTimeout(item.timeoutId);
      this._runTask(item.fn, item.requestId, item.requestType)
        .then(item.resolve)
        .catch(item.reject);
    }
  }

  async waitForIdle() {
    if (this.activeCount === 0 && this.queue.length === 0) {
      return;
    }
    return new Promise((resolve) => {
      this._idleResolvers.push(resolve);
    });
  }

  getStats() {
    return {
      activeCount: this.activeCount,
      queueSize: this.queue.length,
      maxConcurrent: this.maxConcurrent,
      maxQueueSize: this.maxQueueSize,
    };
  }

  clear() {
    for (const item of this.queue) {
      if (item.timeoutId) clearTimeout(item.timeoutId);
      item.cancelled = true;
      const cancelErr = new Error('VehiCare AI queue was cleared.');
      cancelErr.code = 'QUEUE_CLEARED';
      item.reject(cancelErr);
    }
    this.queue = [];

    // Do NOT reset activeCount to 0 while tasks are actively executing.
    // Overwriting activeCount here falsely reports 0 active tasks while tasks
    // are still running in the background, allowing new tasks to exceed concurrency limits.
    // Active tasks will decrement activeCount when they actually complete.
    if (this.activeCount === 0 && this._idleResolvers.length > 0) {
      const resolvers = this._idleResolvers.splice(0);
      resolvers.forEach((resolve) => resolve());
    }
  }
}

export const queueService = new QueueService();
