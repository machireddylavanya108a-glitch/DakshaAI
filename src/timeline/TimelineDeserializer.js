import { processTimelineDataPipeline } from './TimelineVersionManager.js';
import { createSafeTimeline } from './TimelineSchema.js';

function parseJson(text) {
  try {
    return JSON.parse(String(text || '{}'));
  } catch {
    return null;
  }
}

export function deserializeTimeline(payload) {
  const raw = typeof payload === 'string' ? parseJson(payload) : payload;
  if (!raw || typeof raw !== 'object') {
    const fallback = createSafeTimeline();
    fallback.validation = {
      valid: false,
      status: 'fallback',
      repairable: true,
      errors: ['Unable to deserialize timeline payload. Returning safe timeline.'],
      warnings: [],
      diagnostics: {}
    };
    return fallback;
  }

  return processTimelineDataPipeline(raw, {
    sourceType: 'import'
  });
}

export function importTimeline(payload) {
  return deserializeTimeline(payload);
}
