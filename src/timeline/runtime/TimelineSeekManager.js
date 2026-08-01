import { normalizeTimeMs, asArray } from './TimelineRuntimeConfig.js';

function findById(items, id) {
  const safeId = String(id || '');
  return asArray(items).find((item) => String(item?.id || '') === safeId) || null;
}

export class TimelineSeekManager {
  seekByTime(context = {}, timeMs = 0) {
    const scheduler = context.scheduler;
    if (!scheduler) return null;

    scheduler.playbackState.transition('Seeking', { type: 'time' });
    scheduler.clock.seek(normalizeTimeMs(timeMs, 0));
    const cursor = scheduler.cursor.update(scheduler.clock.timeMs);
    scheduler.playbackState.transition('Paused', { type: 'time' });
    return cursor;
  }

  seekByMarker(context = {}, markerId) {
    const marker = findById(context.scheduler?.timeline?.markers, markerId);
    return this.seekByTime(context, marker?.time || 0);
  }

  seekByClip(context = {}, clipId) {
    const clip = findById(context.scheduler?.timeline?.clips, clipId);
    return this.seekByTime(context, clip?.start || 0);
  }

  seekByEvent(context = {}, eventId) {
    const event = findById(context.scheduler?.timeline?.events, eventId);
    return this.seekByTime(context, event?.time || 0);
  }

  seekByChapter(context = {}, chapterId) {
    const marker = asArray(context.scheduler?.timeline?.markers).find(
      (item) => String(item?.type || '').toLowerCase() === 'chapter' && String(item?.id || '') === String(chapterId || '')
    );

    return this.seekByTime(context, marker?.time || 0);
  }

  seekByPercentage(context = {}, percentage = 0) {
    const scheduler = context.scheduler;
    if (!scheduler) return null;

    const percent = Math.max(0, Math.min(1, Number(percentage) || 0));
    const duration = scheduler.cursor.totalDurationMs || 0;
    return this.seekByTime(context, duration * percent);
  }

  seekByCheckpoint(context = {}, checkpointId = null) {
    const scheduler = context.scheduler;
    if (!scheduler || !scheduler.checkpoints) return null;

    const checkpoint = checkpointId
      ? scheduler.checkpoints.getById(checkpointId)
      : scheduler.checkpoints.latest('resume') || scheduler.checkpoints.latest();

    if (!checkpoint) {
      scheduler.diagnostics?.addWarning?.('Checkpoint seek requested but no checkpoint was available.');
      return this.seekByTime(context, 0);
    }

    return this.seekByTime(context, checkpoint.timeMs);
  }
}
