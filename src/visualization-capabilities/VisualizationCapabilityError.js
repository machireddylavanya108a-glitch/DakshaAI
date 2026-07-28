export class VisualizationCapabilityError extends Error {
  constructor({
    code = 'VISUALIZATION_CAPABILITY_ERROR',
    message = 'Visualization capability operation failed.',
    stage = 'unknown',
    recoverable = true,
    safeMessage = 'Visualization capability operation could not be completed safely.',
    details = null,
    cause = null,
    timestamp = new Date().toISOString()
  } = {}) {
    super(message);
    this.name = 'VisualizationCapabilityError';
    this.code = code;
    this.stage = stage;
    this.recoverable = Boolean(recoverable);
    this.safeMessage = safeMessage;
    this.details = details;
    this.cause = cause;
    this.timestamp = timestamp;
  }
}

export function toVisualizationCapabilityError(error, overrides = {}) {
  if (error instanceof VisualizationCapabilityError) {
    return new VisualizationCapabilityError({
      code: error.code,
      message: error.message,
      stage: error.stage,
      recoverable: error.recoverable,
      safeMessage: error.safeMessage,
      details: error.details,
      cause: error.cause,
      timestamp: error.timestamp,
      ...overrides
    });
  }

  return new VisualizationCapabilityError({
    code: 'VISUALIZATION_CAPABILITY_ERROR',
    message: String(error?.message || 'Visualization capability operation failed.'),
    stage: 'unknown',
    recoverable: true,
    safeMessage: 'Visualization capability operation failed and was recovered safely.',
    details: null,
    cause: error,
    ...overrides
  });
}
