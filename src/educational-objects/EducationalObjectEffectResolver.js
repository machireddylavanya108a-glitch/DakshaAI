function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function sanitizeValue(value, depth = 0) {
  if (depth > 6) return '[truncated-depth]';
  if (value === null || value === undefined) return value;
  if (typeof value === 'function') return undefined;
  if (typeof value === 'symbol') return undefined;
  if (typeof value === 'string') {
    return String(value)
      .replace(/javascript:/gi, '')
      .replace(/data:text\/html/gi, '')
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .trim()
      .slice(0, 1000);
  }
  if (typeof value !== 'object') return value;
  if (Array.isArray(value)) {
    return value.slice(0, 100).map((item) => sanitizeValue(item, depth + 1)).filter((item) => item !== undefined);
  }
  const output = Object.create(null);
  for (const [key, nested] of Object.entries(value)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
    const next = sanitizeValue(nested, depth + 1);
    if (next !== undefined) output[key] = next;
  }
  return output;
}

export function resolveEducationalObjectEffects(behavior = {}, options = {}) {
  const maxEffects = Math.max(1, Number(options.maximumEffectsPerDispatch || behavior?.performance?.maximumEffectsPerDispatch || 100));
  const reducedMotion = options.reducedMotion === true;

  const effects = toArray(behavior.effects).slice(0, maxEffects).map((effect, index) => {
    const baseType = String(effect?.type || 'no-op').trim() || 'no-op';
    let effectType = baseType;

    if (reducedMotion && /move|animate|orbit|spin|shake|pulse/i.test(baseType)) {
      effectType = String(behavior?.accessibility?.reducedMotionAlternative?.type || 'highlight');
    }

    return {
      eventId: `${behavior.behaviorId || 'behavior'}::effect-event::${index + 1}`,
      effectId: String(effect?.effectId || `effect-${index + 1}`),
      effectType,
      targetObjectIds: toArray(effect?.targetObjectIds).map((id) => String(id || '').trim()).filter(Boolean),
      property: effect?.property || null,
      value: sanitizeValue(effect?.value),
      requestedState: effect?.targetState || null,
      timelineStepId: effect?.timelineStepId || null,
      reversible: effect?.reversible === true || behavior?.reversible === true,
      priority: Number(effect?.priority || behavior?.priority || index + 1),
      sourceBehaviorId: String(behavior.behaviorId || ''),
      metadata: {
        ...(effect?.metadata && typeof effect.metadata === 'object' ? sanitizeValue(effect.metadata) : {}),
        accessibility: sanitizeValue(behavior?.accessibility || {}),
        performance: sanitizeValue(behavior?.performance || {})
      }
    };
  });

  return effects;
}
