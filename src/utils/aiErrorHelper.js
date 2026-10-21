/**
 * aiErrorHelper.js
 * Contextual, professional error classification and user-facing messaging
 * for VehiCare AI diagnostic and conversational pipelines.
 */

export const getAiErrorMessage = ({ error, inputType = 'text', plan = 'free' }) => {
  const status = error?.response?.status || error?.status;
  const data = error?.response?.data;
  const reason = data?.reason || data?.error?.code || error?.code;
  const message = data?.message || data?.error?.message;
  const rawBody = typeof data === 'string' ? data : '';

  // 1. Network / Connectivity Failures
  const isNetworkError =
    error?.code === 'ERR_NETWORK' ||
    error?.code === 'ECONNABORTED' ||
    error?.code === 'ETIMEDOUT' ||
    error?.message === 'Network Error' ||
    Boolean(!error?.response && error?.request);

  if (isNetworkError) {
    return {
      message: "We couldn't connect to VehiCare at this time. Please check your internet connection and try again.",
      code: 'NETWORK_ERROR',
      retryable: true,
      category: 'network',
    };
  }

  // 2. Usage Quota / Entitlement Limits
  const isLimitError =
    reason === 'ai_limit_reached' ||
    reason === 'AI_LIMIT_EXCEEDED' ||
    reason === 'QUOTA_EXHAUSTED' ||
    status === 403;

  if (isLimitError) {
    let limitMessage;
    if (plan === 'guest') {
      limitMessage = 'You have reached your free guest diagnostic allowance. Please sign in or create an account to continue diagnosing vehicle issues.';
    } else if (plan === 'free') {
      limitMessage = 'You have reached your monthly AI diagnostic allowance. Upgrade to VehiCare Premium for expanded consultations, video diagnostics, and priority analysis.';
    } else {
      limitMessage = 'You have reached your consultation limit for this billing period. Please contact support or check your subscription settings.';
    }
    return {
      message: limitMessage,
      code: 'LIMIT_REACHED',
      retryable: false,
      category: 'quota',
    };
  }

  // 3. Payload / Media Too Large (413 or webserver post limits)
  const isPayloadTooLarge =
    status === 413 ||
    reason === 'MEDIA_TOO_LARGE' ||
    rawBody.includes('POST data is too large') ||
    rawBody.includes('exceeds the limit');

  if (isPayloadTooLarge) {
    let sizeMsg;
    if (inputType === 'video') {
      sizeMsg = 'The video file exceeds the maximum allowed size (up to 30MB for Premium, 15MB for Free). Please select a shorter video or smaller file, then try again.';
    } else if (inputType === 'voice' || inputType === 'audio') {
      sizeMsg = 'The voice recording exceeds the allowed size limit. Please record a shorter clip (under 60 seconds) and try again.';
    } else {
      sizeMsg = 'The attached image file exceeds the maximum allowed upload size (10MB). Please select a smaller photo or lower resolution image.';
    }
    return {
      message: sizeMsg,
      code: 'MEDIA_TOO_LARGE',
      retryable: false,
      category: 'media_validation',
    };
  }

  // 4. Unsupported Media Type (415)
  const isUnsupportedType = status === 415 || reason === 'UNSUPPORTED_MEDIA_TYPE';
  if (isUnsupportedType) {
    let formatMsg;
    if (inputType === 'video') {
      formatMsg = 'The video format is not supported. Please upload an MP4, MOV, or 3GP video file.';
    } else if (inputType === 'voice' || inputType === 'audio') {
      formatMsg = 'The audio format is not supported. Please record using AAC, MP4, WAV, or MP3 format.';
    } else {
      formatMsg = 'The image format is not supported. Please upload a JPEG, PNG, or WebP photo.';
    }
    return {
      message: formatMsg,
      code: 'UNSUPPORTED_MEDIA_TYPE',
      retryable: false,
      category: 'media_validation',
    };
  }

  // 5. Media Processing / Upload Failures (422, 400, or media-specific codes)
  const isMediaProcessingFailure =
    status === 422 ||
    status === 400 ||
    reason === 'INVALID_MEDIA' ||
    reason === 'MEDIA_UPLOAD_FAILED' ||
    reason === 'MEDIA_PROCESSING_FAILED' ||
    reason === 'MEDIA_UPLOAD_TIMEOUT' ||
    reason === 'MEDIA_PROCESSING_TIMEOUT' ||
    rawBody.includes('failed to upload');

  if (isMediaProcessingFailure || ['image', 'video', 'voice', 'audio'].includes(inputType)) {
    if (inputType === 'image') {
      return {
        message: "We couldn't process your image. Please check your connection and ensure the image is clear and in a supported format, then try again. You can also describe the vehicle issue in text.",
        code: reason || 'IMAGE_PROCESSING_FAILED',
        retryable: true,
        category: 'media',
      };
    }
    if (inputType === 'video') {
      return {
        message: "We couldn't analyze your video. Please check the supported file format, size, and duration, then try again. Alternatively, upload a photo or describe the vehicle symptoms.",
        code: reason || 'VIDEO_PROCESSING_FAILED',
        retryable: true,
        category: 'media',
      };
    }
    if (inputType === 'voice' || inputType === 'audio') {
      return {
        message: "We couldn't process your voice recording. Please try recording again in a quiet environment or describe the vehicle issue in text.",
        code: reason || 'VOICE_PROCESSING_FAILED',
        retryable: true,
        category: 'media',
      };
    }
  }

  // 6. Temporary Provider Outage / High Demand (503, 504, 429)
  const isTemporaryIssue =
    status === 503 ||
    status === 504 ||
    status === 429 ||
    reason === 'AI_SERVICE_BUSY' ||
    reason === 'AI_SERVICE_UNAVAILABLE' ||
    reason === 'GEMINI_OVERLOADED' ||
    reason === 'GEMINI_UNAVAILABLE' ||
    reason === 'QUEUE_TIMEOUT' ||
    reason === 'QUEUE_FULL';

  if (isTemporaryIssue) {
    return {
      message: "VehiCare couldn't complete your request at this time due to a temporary processing issue. Please try again shortly.",
      code: reason || 'TEMPORARY_PROCESSING_ISSUE',
      retryable: true,
      category: 'temporary',
    };
  }

  // 7. General Fallback
  const fallbackMessage = message && message.length > 10 && !message.includes('SQL') && !message.includes('Internal')
    ? message
    : "VehiCare couldn't complete your request at this time due to a temporary processing issue. Please try again shortly.";

  return {
    message: fallbackMessage,
    code: reason || 'GENERAL_ERROR',
    retryable: status ? status >= 500 : true,
    category: 'general',
  };
};
