function clone(value) {
  return JSON.parse(JSON.stringify(value || {}));
}

function toObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function sanitizeObject(value, depth = 0) {
  if (depth > 8) return '[truncated-depth]';
  if (value === null || value === undefined) return value;
  if (typeof value === 'function' || typeof value === 'symbol') return undefined;
  if (typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.slice(0, 120).map((item) => sanitizeObject(item, depth + 1)).filter((item) => item !== undefined);
  const output = Object.create(null);
  Object.entries(value).forEach(([key, nested]) => {
    if (key === '__proto__' || key === 'prototype' || key === 'constructor') return;
    const next = sanitizeObject(nested, depth + 1);
    if (next !== undefined) output[key] = next;
  });
  return output;
}

export function resetEducationalObjectForReuse(instance = {}, context = {}, options = {}) {
  const source = clone(instance);
  const clearedFields = [];
  const preservedFields = [];
  const warnings = [];
  const errors = [];

  try {
    source.sceneId = '';
    clearedFields.push('sceneId');

    source.templateInstanceId = null;
    source.slotBinding = null;
    source.regionBinding = null;
    clearedFields.push('templateInstanceId', 'slotBinding', 'regionBinding');

    source.resolvedVariables = {};
    source.resolvedState = {
      ...(toObject(source.resolvedState)),
      history: [],
      transitions: [],
      current: String(source?.resolvedState?.initial || source?.resolvedState?.current || 'ready')
    };
    clearedFields.push('resolvedVariables', 'resolvedState.history', 'resolvedState.transitions');

    source.resolvedData = sanitizeObject({
      ...(toObject(source.resolvedData)),
      transient: undefined,
      temporary: undefined,
      private: undefined,
      lessonText: undefined,
      narrationText: undefined,
      prompt: undefined
    });
    clearedFields.push('resolvedData.transient', 'resolvedData.temporary', 'resolvedData.private');

    if (Array.isArray(source.labels)) {
      source.labels = source.labels.filter((label) => label?.metadata?.transient !== true);
      clearedFields.push('labels[transient]');
    }

    if (toObject(source.narration).metadata?.transient === true) {
      source.narration = {};
      clearedFields.push('narration[transient]');
    }

    source.runtimeMetadata = sanitizeObject({
      ...(toObject(source.runtimeMetadata)),
      behaviorRuntimeState: {
        active: false,
        paused: false,
        stateHistoryCount: 0,
        undoHistoryCount: 0,
        redoHistoryCount: 0
      },
      lifecycleState: {
        initialized: true,
        active: false,
        paused: false,
        completed: false,
        destroyed: false,
        quarantined: false
      },
      timelineBindings: [],
      interactionBindings: [],
      requestDiagnostics: {}
    });
    clearedFields.push('runtimeMetadata.behaviorRuntimeState', 'runtimeMetadata.timelineBindings', 'runtimeMetadata.interactionBindings');

    source.diagnostics = {
      ...(toObject(source.diagnostics)),
      request: {},
      lastError: null,
      loading: false,
      transientWarnings: []
    };
    clearedFields.push('diagnostics.request', 'diagnostics.lastError', 'diagnostics.loading');

    preservedFields.push('objectId', 'objectVersion', 'resolvedRepresentation', 'resolvedAccessibility', 'resolvedPerformance');

    return {
      success: true,
      instance: source,
      clearedFields,
      preservedFields,
      warnings,
      errors,
      diagnostics: {
        status: 'reset',
        policy: options.policy || {},
        context: {
          sceneId: context.sceneId || null,
          templateInstanceId: context.templateInstanceId || null
        }
      }
    };
  } catch (error) {
    errors.push(String(error?.message || 'reset-failed'));
    return {
      success: false,
      instance: source,
      clearedFields,
      preservedFields,
      warnings,
      errors,
      diagnostics: {
        status: 'reset-failed'
      }
    };
  }
}
