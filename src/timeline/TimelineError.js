export class TimelineError extends Error {
  constructor(message, options = {}) {
    super(message || 'Timeline error');
    this.name = 'TimelineError';
    this.code = options.code || 'TIMELINE_ERROR';
    this.details = options.details || {};
  }
}

export function toTimelineError(error, fallbackCode = 'TIMELINE_ERROR') {
  if (error instanceof TimelineError) return error;
  return new TimelineError(error?.message || 'Timeline error', {
    code: fallbackCode,
    details: {
      cause: String(error?.name || 'Error')
    }
  });
}
