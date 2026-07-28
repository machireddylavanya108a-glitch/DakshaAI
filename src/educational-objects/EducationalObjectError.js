export class EducationalObjectError extends Error {
  constructor({
    code = 'UNKNOWN_OBJECT_FAILURE',
    message = 'Educational object operation failed.',
    stage = 'unknown',
    recoverable = true,
    safeMessage = 'Educational object processing failed safely.',
    objectId = null,
    details = null,
    cause = null
  } = {}) {
    super(String(message || 'Educational object operation failed.'));
    this.name = 'EducationalObjectError';
    this.code = String(code || 'UNKNOWN_OBJECT_FAILURE');
    this.stage = String(stage || 'unknown');
    this.recoverable = recoverable !== false;
    this.safeMessage = String(safeMessage || 'Educational object processing failed safely.');
    this.objectId = objectId || null;
    this.details = details || null;
    this.cause = cause || null;
    this.timestamp = new Date().toISOString();
  }
}

export function toEducationalObjectError(error, defaults = {}) {
  if (error instanceof EducationalObjectError) return error;
  return new EducationalObjectError({
    code: defaults.code || 'UNKNOWN_OBJECT_FAILURE',
    message: error?.message || defaults.message || 'Educational object operation failed.',
    stage: defaults.stage || 'unknown',
    recoverable: defaults.recoverable !== false,
    safeMessage: defaults.safeMessage || 'Educational object processing failed safely.',
    objectId: defaults.objectId || null,
    details: defaults.details || null,
    cause: error || defaults.cause || null
  });
}
