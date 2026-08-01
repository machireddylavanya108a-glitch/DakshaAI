export class TimelinePauseManager {
  pause(context = {}) {
    const scheduler = context.scheduler;
    if (!scheduler) return null;

    scheduler.playbackState.transition('Paused', {
      reason: context.reason || 'manual'
    });
    scheduler.clock.pause();

    return scheduler.emitRuntimeEvent('TimelinePaused', {
      reason: context.reason || 'manual',
      timeMs: scheduler.clock.timeMs
    });
  }
}
