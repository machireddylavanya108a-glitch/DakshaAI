import {
  DEFAULT_SCENE_EVENT_PRIORITY,
  isObject,
  asArray,
  normalizeEventTimeMs,
  toFiniteNumber
} from './SceneEventConfig.js';

function normalizeTargets(value) {
  return asArray(value)
    .map((item) => {
      if (item === null || item === undefined) return null;
      return String(item).trim();
    })
    .filter(Boolean);
}

export function normalizeSceneEvent(event, index = 0, source = 'timeline-event') {
  const input = isObject(event) ? event : {};
  const eventId = String(input.id || input.eventId || `${source}-${index + 1}`).trim() || `${source}-${index + 1}`;
  const eventType = String(input.type || input.eventType || input.kind || 'unknown').trim() || 'unknown';
  const timeMs = normalizeEventTimeMs(
    input.timeMs ?? input.time ?? input.atMs ?? input.start ?? input.order,
    0
  );

  return {
    id: eventId,
    type: eventType,
    timeMs,
    priority: toFiniteNumber(input.priority, DEFAULT_SCENE_EVENT_PRIORITY),
    source,
    sourceRefId: String(input.sourceRefId || input.markerId || input.actionId || eventId).trim() || eventId,
    targets: normalizeTargets(input.targets ?? input.targetObjectIds ?? input.targetIds),
    payload: isObject(input.payload)
      ? input.payload
      : isObject(input.parameters)
        ? input.parameters
        : {},
    metadata: isObject(input.metadata) ? input.metadata : {},
    extensions: isObject(input.extensions) ? input.extensions : {}
  };
}

export function validateSceneEvents(events = [], options = {}) {
  const errors = [];
  const warnings = [];
  const normalized = [];
  const ids = new Set();
  const source = String(options.source || 'timeline-event');

  asArray(events).forEach((event, index) => {
    const item = normalizeSceneEvent(event, index, source);

    if (!item.id) {
      errors.push(`Scene event at index ${index} is missing id.`);
      return;
    }

    if (ids.has(item.id)) {
      errors.push(`Duplicate scene event id detected: ${item.id}.`);
      return;
    }

    ids.add(item.id);

    if (!item.type) {
      warnings.push(`Scene event ${item.id} is missing type and was normalized to unknown.`);
    }

    if (!Number.isFinite(Number(item.timeMs))) {
      warnings.push(`Scene event ${item.id} has non-numeric time and was normalized to 0.`);
      item.timeMs = 0;
    }

    if (!Array.isArray(item.targets)) {
      warnings.push(`Scene event ${item.id} has invalid targets and was normalized to an empty list.`);
      item.targets = [];
    }

    normalized.push(item);
  });

  return {
    status: errors.length ? 'invalid' : warnings.length ? 'warning' : 'valid',
    errors,
    warnings,
    repairable: true,
    events: normalized
  };
}
