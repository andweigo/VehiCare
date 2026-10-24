import { getAiErrorMessage } from '../src/utils/aiErrorHelper';
import { formatAiResponseText } from '../src/screens/AskVehiCareScreen';

describe('ChatErrorHandling & Contextual Messaging', () => {
  it('returns exact contextual guidance for image failure', () => {
    const error = {
      response: {
        status: 422,
        data: {
          error: {
            code: 'MEDIA_PROCESSING_FAILED',
            message: 'Gemini could not confirm that the uploaded media is ready.',
          },
        },
      },
    };

    const result = getAiErrorMessage({ error, inputType: 'image' });
    expect(result.message).toBe(
      "We couldn't process your image. Please check your connection and ensure the image is clear and in a supported format, then try again. You can also describe the vehicle issue in text."
    );
    expect(result.retryable).toBe(true);
  });

  it('returns exact contextual guidance for video failure', () => {
    const error = {
      response: {
        status: 422,
        data: {
          error: {
            code: 'MEDIA_PROCESSING_FAILED',
            message: 'Gemini media processing failed.',
          },
        },
      },
    };

    const result = getAiErrorMessage({ error, inputType: 'video' });
    expect(result.message).toBe(
      "We couldn't analyze your video. Please check the supported file format, size, and duration, then try again. Alternatively, upload a photo or describe the vehicle symptoms."
    );
    expect(result.retryable).toBe(true);
  });

  it('returns exact contextual guidance for voice recording failure', () => {
    const error = {
      response: {
        status: 422,
        data: {
          error: {
            code: 'MEDIA_UPLOAD_FAILED',
            message: 'Gemini could not accept the uploaded media.',
          },
        },
      },
    };

    const result = getAiErrorMessage({ error, inputType: 'voice' });
    expect(result.message).toBe(
      "We couldn't process your voice recording. Please try recording again in a quiet environment or describe the vehicle issue in text."
    );
    expect(result.retryable).toBe(true);
  });

  it('keeps vehicle-sound validation errors specific instead of showing a temporary outage', () => {
    const error = {
      code: 'ERR_BAD_REQUEST',
      response: {
        status: 422,
        data: {
          reason: 'AUDIO_VALIDATION_REJECTED',
          message: 'This feature analyzes vehicle sounds. Please record a vehicle noise instead of speech, music, or unrelated audio.',
          error: {
            code: 'AUDIO_VALIDATION_REJECTED',
            details: { outcome: 'irrelevant_audio' },
          },
        },
      },
    };

    const result = getAiErrorMessage({ error, inputType: 'voice' });
    expect(result.code).toBe('AUDIO_VALIDATION_REJECTED');
    expect(result.category).toBe('media_validation');
    expect(result.retryable).toBe(false);
    expect(result.message).toContain('clearly identifiable vehicle sound');
  });

  it('returns exact network failure message on connection error', () => {
    const networkError = {
      message: 'Network Error',
      code: 'ERR_NETWORK',
    };

    const result = getAiErrorMessage({ error: networkError, inputType: 'text' });
    expect(result.message).toBe(
      "We couldn't connect to VehiCare at this time. Please check your internet connection and try again."
    );
    expect(result.retryable).toBe(true);
    expect(result.code).toBe('NETWORK_ERROR');
  });

  it('returns temporary processing issue message for 503 and high-demand errors', () => {
    const error503 = {
      response: {
        status: 503,
        data: {
          error: {
            code: 'AI_SERVICE_UNAVAILABLE',
            message: 'The requested Gemini model is unavailable.',
          },
        },
      },
    };

    const result = getAiErrorMessage({ error: error503, inputType: 'text' });
    expect(result.message).toBe(
      "VehiCare couldn't complete your request at this time due to a temporary processing issue. Please try again shortly."
    );
    expect(result.retryable).toBe(true);
  });

  it('returns specific video size limit guidance on 413 or MEDIA_TOO_LARGE', () => {
    const error413 = {
      response: {
        status: 413,
        data: {
          error: {
            code: 'MEDIA_TOO_LARGE',
          },
        },
      },
    };

    const result = getAiErrorMessage({ error: error413, inputType: 'video' });
    expect(result.message).toContain('30MB');
    expect(result.message).toContain('video file exceeds');
    expect(result.retryable).toBe(false);
  });

  it('returns specific format guidance on 415 unsupported format', () => {
    const error415 = {
      response: {
        status: 415,
        data: {
          error: {
            code: 'UNSUPPORTED_MEDIA_TYPE',
          },
        },
      },
    };

    const result = getAiErrorMessage({ error: error415, inputType: 'video' });
    expect(result.message).toBe(
      'The video format is not supported. Please upload an MP4, MOV, or 3GP video file.'
    );
    expect(result.retryable).toBe(false);
  });

  it('returns appropriate plan guidance when user quota is reached', () => {
    const quotaError = {
      response: {
        status: 403,
        data: {
          reason: 'ai_limit_reached',
        },
      },
    };

    const guestResult = getAiErrorMessage({ error: quotaError, inputType: 'text', plan: 'guest' });
    expect(guestResult.message).toContain('guest diagnostic allowance');
    expect(guestResult.message).toContain('sign in or create an account');

    const freeResult = getAiErrorMessage({ error: quotaError, inputType: 'text', plan: 'free' });
    expect(freeResult.message).toContain('monthly AI diagnostic allowance');
    expect(freeResult.message).toContain('VehiCare Premium');

    const premiumResult = getAiErrorMessage({ error: quotaError, inputType: 'text', plan: 'premium' });
    expect(premiumResult.message).toContain('consultation limit for this billing period');
  });

  it('correctly classifies 503 provider outages on image requests as temporary issue rather than media error', () => {
    const error503OnImage = {
      response: {
        status: 503,
        data: {
          error: {
            code: 'AI_SERVICE_UNAVAILABLE',
            message: 'Our diagnostic service is experiencing high demand. Please try again in a few moments.',
          },
        },
      },
    };

    const result = getAiErrorMessage({ error: error503OnImage, inputType: 'image' });
    expect(result.category).toBe('temporary');
    expect(result.message).toBe(
      "VehiCare couldn't complete your request at this time due to a temporary processing issue. Please try again shortly."
    );
    expect(result.retryable).toBe(true);
  });

  it('formatAiResponseText returns error failure message when data is null, not a welcome greeting', () => {
    const formatted = formatAiResponseText(null);
    expect(formatted).toBe('VehiCare AI was unable to generate a response. Please try again.');
    expect(formatted).not.toContain('How can I assist you with your vehicle today?');
  });

  it('formatAiResponseText formats vehicle mismatch cleanly with prompt to clarify or switch', () => {
    const mismatchData = {
      type: 'vehicle_mismatch',
      status: 'vehicle_mismatch',
      image_vehicle_match: 'possible_mismatch',
      response: 'The uploaded photo appears to depict a Motorcycle, which does not match your Lamborghini Urus profile.',
    };

    const formatted = formatAiResponseText(mismatchData);
    expect(formatted).toContain('Motorcycle');
    expect(formatted).toContain('Lamborghini Urus');
  });

  it('formatAiResponseText formats vehicle switch confirmation cleanly', () => {
    const switchData = {
      type: 'vehicle_switch_confirmation_required',
      status: 'vehicle_switch_confirmation_required',
      response: 'Your inquiry mentions a Ferrari F8, which is different from your selected Lamborghini Urus. Would you like to switch vehicle profiles or start a separate consultation?',
    };

    const formatted = formatAiResponseText(switchData);
    expect(formatted).toContain('Ferrari F8');
    expect(formatted).toContain('switch vehicle profile');
  });
});
