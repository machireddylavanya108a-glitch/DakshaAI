export class EducationalObjectRegistryError extends Error {
  constructor(message = 'Educational object registry error.', options = {}) {
    super(String(message || 'Educational object registry error.'));
    this.name = 'EducationalObjectRegistryError';
    this.code = String(options.code || 'OBJECT_REGISTRATION_FAILED');
    this.details = options.details && typeof options.details === 'object' ? options.details : {};
  }
}

export function toEducationalObjectRegistryError(error, fallbackCode = 'OBJECT_REGISTRATION_FAILED', fallbackMessage = 'Educational object registry error.') {
  if (error instanceof EducationalObjectRegistryError) return error;
  if (error instanceof Error) {
    return new EducationalObjectRegistryError(error.message || fallbackMessage, {
      code: error.code || fallbackCode,
      details: { cause: error.name || 'Error' }
    });
  }
  return new EducationalObjectRegistryError(fallbackMessage, {
    code: fallbackCode,
    details: { value: error }
  });
}
