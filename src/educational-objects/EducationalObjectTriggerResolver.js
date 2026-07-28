function toArray(value) {
  return Array.isArray(value) ? value : [];
}

export function resolveEducationalObjectTriggers(behaviors = [], signal = {}, context = {}) {
  const signalType = String(signal?.type || '').trim();
  const sourceObjectId = String(signal?.sourceObjectId || '').trim();
  const matched = [];

  toArray(behaviors).forEach((behavior) => {
    if (!behavior || behavior.enabled === false) return;
    toArray(behavior.triggers).forEach((trigger) => {
      if (!trigger || typeof trigger !== 'object') return;
      const triggerType = String(trigger.type || '').trim();
      if (triggerType && signalType && triggerType !== signalType) return;
      if (trigger.sourceObjectId && sourceObjectId && String(trigger.sourceObjectId) !== sourceObjectId) return;
      if (trigger.timelineStepId && signal.timelineStepId && String(trigger.timelineStepId) !== String(signal.timelineStepId)) return;
      if (trigger.interactionId && signal.interactionId && String(trigger.interactionId) !== String(signal.interactionId)) return;

      matched.push({
        behaviorId: behavior.behaviorId,
        trigger,
        priority: Number(trigger.priority || behavior.priority || 0),
        metadata: {
          source: trigger.sourceObjectId || signal.sourceObjectId || null,
          state: context?.state || null
        }
      });
    });
  });

  matched.sort((a, b) => b.priority - a.priority || String(a.behaviorId).localeCompare(String(b.behaviorId)));
  return matched;
}
