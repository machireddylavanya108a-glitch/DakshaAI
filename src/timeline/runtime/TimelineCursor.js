import { asArray, normalizeTimeMs } from './TimelineRuntimeConfig.js';

function findActiveByTime(items, timeMs, startKey, endKey) {
  const safeItems = asArray(items);
  let active = null;

  for (const item of safeItems) {
    const start = normalizeTimeMs(item?.[startKey], 0);
    const end = normalizeTimeMs(item?.[endKey], start);
    if (timeMs >= start && timeMs <= end) {
      active = item;
      break;
    }
  }

  return active;
}

function findLastByTime(items, timeMs, timeKey) {
  let last = null;
  for (const item of asArray(items)) {
    const point = normalizeTimeMs(item?.[timeKey], 0);
    if (point <= timeMs) last = item;
  }
  return last;
}

function computeDuration(timeline = {}) {
  const clipEnds = asArray(timeline.clips).map((clip) => normalizeTimeMs(clip?.end, clip?.start || 0));
  const markerTimes = asArray(timeline.markers).map((marker) => normalizeTimeMs(marker?.time, 0));
  const eventTimes = asArray(timeline.events).map((event) => normalizeTimeMs(event?.time, 0));
  const all = [...clipEnds, ...markerTimes, ...eventTimes];
  if (!all.length) return 0;
  return Math.max(...all);
}

export class TimelineCursor {
  constructor(timeline = {}) {
    this.timeline = timeline;
    this.timeMs = 0;
    this.totalDurationMs = computeDuration(timeline);
    this.currentClip = null;
    this.currentEvent = null;
    this.currentMarker = null;
    this.currentChapter = null;
    this.progress = 0;
    this.elapsedTimeMs = 0;
    this.remainingTimeMs = this.totalDurationMs;
  }

  update(timeMs = 0) {
    this.timeMs = normalizeTimeMs(timeMs, 0);
    this.totalDurationMs = computeDuration(this.timeline);
    this.currentClip = findActiveByTime(this.timeline.clips, this.timeMs, 'start', 'end');
    this.currentEvent = findLastByTime(this.timeline.events, this.timeMs, 'time');
    this.currentMarker = findLastByTime(this.timeline.markers, this.timeMs, 'time');
    this.currentChapter = findLastByTime(
      asArray(this.timeline.markers).filter((marker) => String(marker?.type || '').toLowerCase() === 'chapter'),
      this.timeMs,
      'time'
    );

    const duration = Math.max(0, this.totalDurationMs);
    this.elapsedTimeMs = this.timeMs;
    this.remainingTimeMs = Math.max(0, duration - this.timeMs);
    this.progress = duration > 0 ? Math.max(0, Math.min(1, this.timeMs / duration)) : 0;

    return this.snapshot();
  }

  snapshot() {
    return {
      timeMs: this.timeMs,
      currentClip: this.currentClip,
      currentEvent: this.currentEvent,
      currentMarker: this.currentMarker,
      currentChapter: this.currentChapter,
      progress: this.progress,
      elapsedTimeMs: this.elapsedTimeMs,
      remainingTimeMs: this.remainingTimeMs,
      totalDurationMs: this.totalDurationMs
    };
  }
}
