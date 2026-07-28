export class VisualizationTemplateError extends Error {
  constructor({
    code = 'UNKNOWN_TEMPLATE_FAILURE',
    message = 'Visualization template operation failed.',
    stage = 'unknown',
    recoverable = true,
    safeMessage = 'Visualization template operation could not be completed safely.',
    templateId = null,
    details = null,
    cause = null,
    timestamp = new Date().toISOString()
  } = {}) {
    super(message);
    this.name = 'VisualizationTemplateError';
    this.code = code;
    this.stage = stage;
    this.recoverable = Boolean(recoverable);
    this.safeMessage = safeMessage;
    this.templateId = templateId;
    this.details = details;
    this.cause = cause;
    this.timestamp = timestamp;
  }
}

export function toVisualizationTemplateError(error, overrides = {}) {
  if (error instanceof VisualizationTemplateError) {
    return new VisualizationTemplateError({
      code: error.code,
      message: error.message,
      stage: error.stage,
      recoverable: error.recoverable,
      safeMessage: error.safeMessage,
      templateId: error.templateId,
      details: error.details,
      cause: error.cause,
      timestamp: error.timestamp,
      ...overrides
    });
  }

  return new VisualizationTemplateError({
    code: 'UNKNOWN_TEMPLATE_FAILURE',
    message: String(error?.message || 'Visualization template operation failed.'),
    stage: 'unknown',
    recoverable: true,
    safeMessage: 'Visualization template operation failed and was safely contained.',
    details: null,
    cause: error,
    ...overrides
  });
}
