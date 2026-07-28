export class EducationalObjectBehaviorError extends Error {
  constructor(message = 'Educational object behavior error.', options = {}) {
    super(String(message || 'Educational object behavior error.'));
    this.name = 'EducationalObjectBehaviorError';
    this.code = String(options.code || 'EDUCATIONAL_OBJECT_BEHAVIOR_ERROR');
    this.details = options.details && typeof options.details === 'object' ? options.details : {};
  }
}

export function toEducationalObjectBehaviorError(error, fallbackMessage = 'Educational object behavior error.') {
  if (error instanceof EducationalObjectBehaviorError) return error;
  if (error instanceof Error) {
    return new EducationalObjectBehaviorError(error.message || fallbackMessage, {
      code: error.code || 'EDUCATIONAL_OBJECT_BEHAVIOR_ERROR',
      details: { cause: error.name || 'Error' }
    });
  }

  return new EducationalObjectBehaviorError(fallbackMessage, {
    code: 'EDUCATIONAL_OBJECT_BEHAVIOR_ERROR',
    details: { value: error }
  });
}
