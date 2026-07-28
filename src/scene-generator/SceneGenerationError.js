export class SceneGenerationError extends Error {
  constructor({
    code = 'UNKNOWN_GENERATION_FAILURE',
    message = 'Scene generation failed.',
    stage = 'unknown',
    retryable = false,
    provider = 'unknown',
    statusCode = null,
    safeMessage = 'Scene generation could not be completed.',
    details = null,
    cause = null,
    timestamp = new Date().toISOString()
  } = {}) {
    super(message);
    this.name = 'SceneGenerationError';
    this.code = code;
    this.stage = stage;
    this.retryable = Boolean(retryable);
    this.provider = provider;
    this.statusCode = Number.isFinite(Number(statusCode)) ? Number(statusCode) : null;
    this.safeMessage = safeMessage;
    this.details = details;
    this.cause = cause;
    this.timestamp = timestamp;
  }
}

export function toSceneGenerationError(error, overrides = {}) {
  if (error instanceof SceneGenerationError) {
    return new SceneGenerationError({
      code: error.code,
      message: error.message,
      stage: error.stage,
      retryable: error.retryable,
      provider: error.provider,
      statusCode: error.statusCode,
      safeMessage: error.safeMessage,
      details: error.details,
      cause: error.cause,
      timestamp: error.timestamp,
      ...overrides
    });
  }

  const statusCode = Number(error?.statusCode || error?.status || error?.response?.status || error?.code);
  const message = String(error?.message || 'Scene generation failed.');
  const isAbort = error?.name === 'AbortError' || message.toLowerCase().includes('aborted');

  return new SceneGenerationError({
    code: isAbort ? 'REQUEST_CANCELLED' : 'UNKNOWN_GENERATION_FAILURE',
    message,
    stage: 'unknown',
    retryable: false,
    provider: 'unknown',
    statusCode: Number.isFinite(statusCode) ? statusCode : null,
    safeMessage: isAbort
      ? 'Scene generation was cancelled.'
      : 'Scene generation could not be completed safely.',
    details: null,
    cause: error,
    ...overrides
  });
}
