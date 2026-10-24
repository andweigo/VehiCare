import config from '../config/env.js';
import logger from '../utils/logger.js';

export class QueueService {
  constructor(options = {}) {
    this.activeCount = 0;
    this.queue = [];
    this.userPendingCount = new Map();
    this.maxConcurrent = options.maxConcurrent ?? config.concurrency.maxConcurrent;
    this.maxQueueSize = options.maxQueueSize ?? config.concurrency.maxQueueSize;
    this.maxQueueWaitMs = options.maxQueueWaitMs ?? config.concurrency.maxQueueWaitMs;
    this.maxPendingPerUser = options.maxPendingPerUser ?? (config.concurrency.maxPendingPerUser || 2);
    this._idleResolvers = [];
    this.isShuttingDown = false;

    this.metrics = {
      totalEnqueued: 0,
      completedSuccess: 0,
      completedFailed: 0,
      queueRejectionsFull: 0,
      queueRejectionsUserLimit: 0,
      queueTimeouts: 0,
      clientCancellations: 0,
      providerTimeouts: 0,
      providerRateLimits: 0,
      totalQueueWaitMs: 0,
      totalProcessingMs: 0,
    };
  }

  _getUserKey(userContext, userKey = null) {
    if (userKey) return String(userKey);
    if (userContext?.id !== undefined && userContext?.id !== null) {
      return `user_${userContext.id}`;
    }
    return null;
  }

  _incrementUserPending(userKey) {
    if (!userKey) return;
    const current = this.userPendingCount.get(userKey) || 0;
    this.userPendingCount.set(userKey, current + 1);
  }

  _decrementUserPending(userKey) {
    if (!userKey) return;
    const current = this.userPendingCount.get(userKey) || 0;
    if (current <= 1) {
      this.userPendingCount.delete(userKey);
    } else {
      this.userPendingCount.set(userKey, current - 1);
    }
  }

  async enqueue(fn, requestId, optionsOrType = 'diagnostic') {
    const options = typeof optionsOrType === 'string'
      ? { requestType: optionsOrType }
      : (optionsOrType || {});

    const requestType = options.requestType || 'diagnostic';
    const userKey = this._getUserKey(options.userContext, options.userKey);
    const planTier = (options.planTier || options.entitlements?.plan || options.userContext?.plan || 'free').toLowerCase();
    const signal = options.signal || null;

    if (this.isShuttingDown) {
      const err = new Error('VehiCare AI service is shutting down and cannot accept new requests.');
      err.code = 'SERVICE_SHUTTING_DOWN';
      err.statusCode = 503;
      err.status = 503;
      err.retryable = true;
      throw err;
    }

    if (signal && signal.aborted) {
      this.metrics.clientCancellations++;
      const err = new Error('Client cancelled the request before execution.');
      err.code = 'CLIENT_CANCELLED';
      err.statusCode = 499;
      err.status = 499;
      err.retryable = false;
      throw err;
    }

    // Check per-user pending limit where user identity is available
    if (userKey) {
      const userPending = this.userPendingCount.get(userKey) || 0;
      if (userPending >= this.maxPendingPerUser) {
        this.metrics.queueRejectionsUserLimit++;
        logger.warn('AI_QUEUE_USER_LIMIT_EXCEEDED', requestId, {
          userKey,
          userPending,
          maxPendingPerUser: this.maxPendingPerUser,
        });
        const limitErr = new Error('You already have a diagnosis request in progress. Please wait for it to complete.');
        limitErr.code = 'USER_CONCURRENCY_LIMIT_EXCEEDED';
        limitErr.statusCode = 429;
        limitErr.status = 429;
        limitErr.retryable = true;
        throw limitErr;
      }
    }

    // If capacity is available and no requests are waiting in queue, run immediately
    if (this.activeCount < this.maxConcurrent && this.queue.length === 0) {
      this._incrementUserPending(userKey);
      this.metrics.totalEnqueued++;
      return this._runTask(fn, requestId, requestType, userKey, 0, signal);
    }

    // Check queue capacity limit
    if (this.queue.length >= this.maxQueueSize) {
      this.metrics.queueRejectionsFull++;
      logger.warn('AI_QUEUE_FULL', requestId, {
        activeCount: this.activeCount,
        queueSize: this.queue.length,
        maxQueueSize: this.maxQueueSize,
      });
      const queueFullErr = new Error('VehiCare AI is currently handling several requests. Please try again shortly.');
      queueFullErr.code = 'QUEUE_FULL';
      queueFullErr.statusCode = 429;
      queueFullErr.status = 429;
      queueFullErr.retryable = true;
      throw queueFullErr;
    }

    // Enter Concurrency Queue
    this._incrementUserPending(userKey);
    this.metrics.totalEnqueued++;
    const queueStartTime = Date.now();
    const basePriority = planTier === 'premium' ? 10 : 0;

    logger.info('AI_QUEUE_ENTERED', requestId, {
      queuePosition: this.queue.length + 1,
      activeCount: this.activeCount,
      requestType,
      userKey,
      planTier,
    });

    return new Promise((resolve, reject) => {
      let timeoutId = null;

      const item = {
        requestId,
        requestType,
        userKey,
        planTier,
        basePriority,
        enqueuedAt: queueStartTime,
        fn,
        resolve,
        reject,
        timeoutId,
        signal,
        cancelled: false,
        abortHandler: null,
      };

      if (signal) {
        item.abortHandler = () => {
          if (item.cancelled) return;
          item.cancelled = true;
          clearTimeout(item.timeoutId);
          const index = this.queue.indexOf(item);
          if (index !== -1) {
            this.queue.splice(index, 1);
          }
          this._decrementUserPending(userKey);
          this.metrics.clientCancellations++;

          const waitMs = Date.now() - queueStartTime;
          logger.info('AI_QUEUE_CANCELLED_CLIENT_DISCONNECTED', requestId, {
            queueWaitMs: waitMs,
            requestType,
            userKey,
          });

          const cancelErr = new Error('Client disconnected while waiting in queue.');
          cancelErr.code = 'CLIENT_CANCELLED';
          cancelErr.statusCode = 499;
          cancelErr.status = 499;
          cancelErr.retryable = false;
          reject(cancelErr);
        };
        signal.addEventListener('abort', item.abortHandler, { once: true });
      }

      timeoutId = setTimeout(() => {
        if (item.cancelled) return;
        item.cancelled = true;
        if (signal && item.abortHandler) {
          signal.removeEventListener('abort', item.abortHandler);
        }
        const index = this.queue.indexOf(item);
        if (index !== -1) {
          this.queue.splice(index, 1);
        }
        this._decrementUserPending(userKey);
        this.metrics.queueTimeouts++;

        const waitMs = Date.now() - queueStartTime;
        logger.warn('AI_QUEUE_TIMEOUT', requestId, {
          queueWaitMs: waitMs,
          requestType,
          queueSize: this.queue.length,
          userKey,
        });

        const timeoutErr = new Error('VehiCare AI request timed out waiting in queue. Please try again shortly.');
        timeoutErr.code = 'QUEUE_TIMEOUT';
        timeoutErr.statusCode = 429;
        timeoutErr.status = 429;
        timeoutErr.retryable = true;
        reject(timeoutErr);
      }, this.maxQueueWaitMs);

      item.timeoutId = timeoutId;
      this.queue.push(item);
    });
  }

  async _runTask(fn, requestId, requestType, userKey = null, queueWaitMs = 0, signal = null) {
    this.activeCount++;
    const taskStartTime = Date.now();
    this.metrics.totalQueueWaitMs += queueWaitMs;

    logger.info('AI_QUEUE_STARTED', requestId, {
      activeCount: this.activeCount,
      queueSize: this.queue.length,
      requestType,
      userKey,
      queueWaitMs,
    });

    try {
      if (signal && signal.aborted) {
        this.metrics.clientCancellations++;
        const err = new Error('Client cancelled request before execution started.');
        err.code = 'CLIENT_CANCELLED';
        err.statusCode = 499;
        err.status = 499;
        err.retryable = false;
        throw err;
      }
      const res = await fn();
      this.metrics.completedSuccess++;
      return res;
    } catch (err) {
      this.metrics.completedFailed++;
      const code = err.code || '';
      const status = err.statusCode || err.status || 0;
      if (code === 'GEMINI_TIMEOUT' || status === 504 || code === 'DEADLINE_EXCEEDED') {
        this.metrics.providerTimeouts++;
      } else if (code === 'RESOURCE_EXHAUSTED' || status === 429) {
        this.metrics.providerRateLimits++;
      } else if (code === 'CLIENT_CANCELLED' || status === 499) {
        this.metrics.clientCancellations++;
      }
      throw err;
    } finally {
      const taskDurationMs = Date.now() - taskStartTime;
      this.metrics.totalProcessingMs += taskDurationMs;
      this.activeCount = Math.max(0, this.activeCount - 1);
      this._decrementUserPending(userKey);
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

    const now = Date.now();

    while (this.queue.length > 0 && this.activeCount < this.maxConcurrent) {
      // Prioritize with anti-starvation aging (+1 priority per 2000ms waited)
      let bestIdx = -1;
      let bestScore = -Infinity;
      let bestEnqueuedAt = Infinity;

      for (let i = 0; i < this.queue.length; i++) {
        const item = this.queue[i];
        if (!item || item.cancelled) continue;

        const ageMs = now - item.enqueuedAt;
        const agingBoost = Math.floor(ageMs / 2000);
        const score = item.basePriority + agingBoost;

        if (score > bestScore || (score === bestScore && item.enqueuedAt < bestEnqueuedAt)) {
          bestScore = score;
          bestEnqueuedAt = item.enqueuedAt;
          bestIdx = i;
        }
      }

      if (bestIdx === -1) {
        this.queue = [];
        break;
      }

      const [item] = this.queue.splice(bestIdx, 1);
      if (!item || item.cancelled) continue;

      clearTimeout(item.timeoutId);
      if (item.signal && item.abortHandler) {
        item.signal.removeEventListener('abort', item.abortHandler);
      }

      const queueWaitMs = Date.now() - item.enqueuedAt;
      this._runTask(item.fn, item.requestId, item.requestType, item.userKey, queueWaitMs, item.signal)
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
      maxQueueWaitMs: this.maxQueueWaitMs,
      maxPendingPerUser: this.maxPendingPerUser,
      activeUsers: this.userPendingCount.size,
      isShuttingDown: this.isShuttingDown,
    };
  }

  getMetrics() {
    const totalCompleted = this.metrics.completedSuccess + this.metrics.completedFailed;
    const avgWaitMs = totalCompleted > 0
      ? Math.round(this.metrics.totalQueueWaitMs / totalCompleted)
      : 0;
    const avgProcessingMs = totalCompleted > 0
      ? Math.round(this.metrics.totalProcessingMs / totalCompleted)
      : 0;

    return {
      ...this.metrics,
      totalCompleted,
      averageQueueWaitMs: avgWaitMs,
      averageProcessingMs: avgProcessingMs,
    };
  }

  clear() {
    for (const item of this.queue) {
      if (item.timeoutId) clearTimeout(item.timeoutId);
      if (item.signal && item.abortHandler) {
        item.signal.removeEventListener('abort', item.abortHandler);
      }
      item.cancelled = true;
      const cancelErr = new Error('VehiCare AI queue was cleared.');
      cancelErr.code = 'QUEUE_CLEARED';
      cancelErr.statusCode = 503;
      cancelErr.status = 503;
      item.reject(cancelErr);
    }
    this.queue = [];
    this.userPendingCount.clear();

    if (this.activeCount === 0 && this._idleResolvers.length > 0) {
      const resolvers = this._idleResolvers.splice(0);
      resolvers.forEach((resolve) => resolve());
    }
  }

  async shutdown(timeoutMs = 8000) {
    this.isShuttingDown = true;
    this.clear();

    if (this.activeCount === 0) {
      return true;
    }

    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        logger.warn('AI_QUEUE_SHUTDOWN_TIMEOUT', null, { remainingActive: this.activeCount });
        resolve(false);
      }, timeoutMs);

      this.waitForIdle().then(() => {
        clearTimeout(timer);
        resolve(true);
      });
    });
  }
}

export const queueService = new QueueService();
