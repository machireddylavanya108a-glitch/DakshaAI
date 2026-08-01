export class TimelineRuntimeError extends Error {
  constructor(message, options = {}) {
    super(message || 'Timeline runtime error');
    this.name = 'TimelineRuntimeError';
    this.code = options.code || 'TIMELINE_RUNTIME_ERROR';
    this.details = options.details || {};
  }
}

export class TimelineSecurityError extends TimelineRuntimeError {
  constructor(message, options = {}) {
    super(message || 'Timeline security error', {
      ...options,
      code: options.code || 'TIMELINE_SECURITY_ERROR'
    });
    this.name = 'TimelineSecurityError';
  }
}

export class TimelineStateError extends TimelineRuntimeError {
  constructor(message, options = {}) {
    super(message || 'Timeline state error', {
      ...options,
      code: options.code || 'TIMELINE_STATE_ERROR'
    });
    this.name = 'TimelineStateError';
  }
}

export function toTimelineRuntimeError(error, code = 'TIMELINE_RUNTIME_ERROR') {
  if (error instanceof TimelineRuntimeError) return error;
  return new TimelineRuntimeError(error?.message || 'Timeline runtime error', {
    code,
    details: {
      cause: String(error?.name || 'Error')
    }
  });
}
