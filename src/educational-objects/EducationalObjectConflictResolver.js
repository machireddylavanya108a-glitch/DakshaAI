function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function stableSort(items = []) {
  return [...items].sort((a, b) => {
    const ap = Number(a?.priority || 0);
    const bp = Number(b?.priority || 0);
    if (bp !== ap) return bp - ap;
    return String(a?.behaviorId || '').localeCompare(String(b?.behaviorId || ''));
  });
}

export function resolveEducationalObjectBehaviorConflicts(candidateExecutions = [], options = {}) {
  const strategy = String(options.strategy || 'priority');
  const resolved = [];
  const conflicts = [];
  const requiredConflicts = [];

  const byTargetKey = new Map();
  stableSort(candidateExecutions).forEach((candidate) => {
    const effects = toArray(candidate?.effects);
    effects.forEach((effect) => {
      const targetIds = toArray(effect?.targetObjectIds);
      const requestedState = String(effect?.requestedState || '').trim();
      const property = String(effect?.property || '').trim();
      const valueSignature = JSON.stringify(effect?.value ?? null);

      targetIds.forEach((targetObjectId) => {
        const stateKey = requestedState ? `${targetObjectId}::state::${requestedState}` : null;
        const propertyKey = property ? `${targetObjectId}::property::${property}` : null;

        [stateKey, propertyKey].filter(Boolean).forEach((key) => {
          const existing = byTargetKey.get(key);
          if (!existing) {
            byTargetKey.set(key, {
              behaviorId: candidate.behaviorId,
              priority: Number(candidate.priority || 0),
              valueSignature,
              effect
            });
            return;
          }

          const conflict = {
            key,
            existingBehaviorId: existing.behaviorId,
            incomingBehaviorId: candidate.behaviorId,
            existingPriority: existing.priority,
            incomingPriority: Number(candidate.priority || 0),
            required: candidate.required === true || existing.required === true,
            type: requestedState ? 'state-conflict' : 'property-conflict'
          };

          conflicts.push(conflict);

          if (existing.valueSignature !== valueSignature && conflict.required) {
            requiredConflicts.push(conflict);
          }

          if (strategy === 'merge') {
            byTargetKey.set(key, {
              behaviorId: `${existing.behaviorId},${candidate.behaviorId}`,
              priority: Math.max(existing.priority, Number(candidate.priority || 0)),
              valueSignature,
              effect: {
                ...effect,
                metadata: {
                  ...(effect.metadata || {}),
                  mergedWith: existing.behaviorId
                }
              }
            });
            return;
          }

          if (strategy === 'sequence') {
            byTargetKey.set(key, {
              behaviorId: existing.behaviorId,
              priority: existing.priority,
              valueSignature: existing.valueSignature,
              effect: {
                ...existing.effect,
                metadata: {
                  ...(existing.effect?.metadata || {}),
                  queuedBehaviors: [...new Set([...(existing.effect?.metadata?.queuedBehaviors || []), candidate.behaviorId])]
                }
              }
            });
            return;
          }

          if (strategy === 'defer') {
            conflict.deferred = true;
            return;
          }

          if (strategy === 'discard-optional' && !conflict.required) {
            conflict.discarded = true;
            return;
          }

          if (Number(candidate.priority || 0) > existing.priority) {
            byTargetKey.set(key, {
              behaviorId: candidate.behaviorId,
              priority: Number(candidate.priority || 0),
              valueSignature,
              effect
            });
          }
        });
      });
    });
  });

  const winnerByBehavior = new Map();
  for (const item of byTargetKey.values()) {
    const behaviorIds = String(item.behaviorId || '').split(',').map((value) => value.trim()).filter(Boolean);
    behaviorIds.forEach((behaviorId) => {
      if (!winnerByBehavior.has(behaviorId)) winnerByBehavior.set(behaviorId, []);
      winnerByBehavior.get(behaviorId).push(item.effect);
    });
  }

  stableSort(candidateExecutions).forEach((candidate) => {
    const effects = winnerByBehavior.get(candidate.behaviorId) || [];
    if (!effects.length) return;
    resolved.push({
      behaviorId: candidate.behaviorId,
      priority: Number(candidate.priority || 0),
      effects,
      required: candidate.required === true
    });
  });

  return {
    resolved,
    conflicts,
    requiredConflicts,
    diagnostics: {
      conflictCount: conflicts.length,
      requiredConflictCount: requiredConflicts.length,
      strategy
    }
  };
}
