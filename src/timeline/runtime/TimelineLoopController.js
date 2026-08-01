import { LOOP_MODES, normalizeTimeMs } from './TimelineRuntimeConfig.js';

export class TimelineLoopController {
  constructor() {
    this.mode = 'none';
    this.range = { startMs: 0, endMs: 0 };
    this.targetClipId = null;
  }

  setMode(mode = 'none', options = {}) {
    const safeMode = LOOP_MODES.includes(mode) ? mode : String(mode || 'none');
    this.mode = safeMode;
    this.range = {
      startMs: normalizeTimeMs(options.startMs, 0),
      endMs: normalizeTimeMs(options.endMs, 0)
    };
    this.targetClipId = options.clipId || null;
    return this.snapshot();
  }

  resolveLoopTime(cursor = {}) {
    if (this.mode === 'repeat-lesson') return 0;

    if (this.mode === 'repeat-range') {
      return this.range.startMs;
    }

    if (this.mode === 'repeat-section') {
      return normalizeTimeMs(cursor.currentChapter?.time, 0);
    }

    if (this.mode === 'repeat-clip') {
      return normalizeTimeMs(cursor.currentClip?.start, 0);
    }

    return null;
  }

  shouldLoop(cursor = {}) {
    if (this.mode === 'none') return false;

    if (this.mode === 'repeat-range') {
      return cursor.timeMs >= this.range.endMs;
    }

    if (this.mode === 'repeat-clip') {
      return Boolean(cursor.currentClip) && cursor.timeMs >= normalizeTimeMs(cursor.currentClip.end, cursor.timeMs);
    }

    if (this.mode === 'repeat-section') {
      const chapterStart = normalizeTimeMs(cursor.currentChapter?.time, 0);
      return cursor.timeMs > chapterStart && cursor.remainingTimeMs <= 0;
    }

    if (this.mode === 'repeat-lesson') {
      return cursor.remainingTimeMs <= 0;
    }

    return false;
  }

  snapshot() {
    return {
      mode: this.mode,
      range: { ...this.range },
      targetClipId: this.targetClipId
    };
  }
}
