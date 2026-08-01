export class TimelineResumeManager {
  resume(context = {}) {
    const scheduler = context.scheduler;
    if (!scheduler) return null;

    scheduler.playbackState.transition('Playing', {
      reason: context.reason || 'manual'
    });
    scheduler.clock.resume();

    return scheduler.emitRuntimeEvent('TimelineResumed', {
      reason: context.reason || 'manual',
      timeMs: scheduler.clock.timeMs
    });
  }
}
