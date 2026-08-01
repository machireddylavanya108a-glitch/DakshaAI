import { processTimelineDataPipeline } from './TimelineVersionManager.js';

export function deepCloneTimeline(timeline) {
  try {
    return JSON.parse(JSON.stringify(timeline || {}));
  } catch {
    return processTimelineDataPipeline({});
  }
}

export function serializeTimeline(timeline, pretty = false) {
  const processed = processTimelineDataPipeline(timeline || {});
  return JSON.stringify(processed, null, pretty ? 2 : 0);
}

export function exportTimeline(timeline, pretty = true) {
  return {
    content: serializeTimeline(timeline, pretty),
    mimeType: 'application/json',
    extension: '.timeline.json'
  };
}
