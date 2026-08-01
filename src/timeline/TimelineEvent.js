import { isObject } from './TimelineConfig.js';

export function createTimelineEvent(overrides = {}) {
  const source = isObject(overrides) ? overrides : {};
  return {
    id: source.id || '',
    type: source.type || 'custom',
    time: Number.isFinite(Number(source.time)) ? Number(source.time) : 0,
    targets: Array.isArray(source.targets) ? source.targets : [],
    payload: isObject(source.payload) ? source.payload : {},
    priority: Number.isFinite(Number(source.priority)) ? Number(source.priority) : 0,
    conditions: Array.isArray(source.conditions) ? source.conditions : [],
    effects: Array.isArray(source.effects) ? source.effects : [],
    metadata: isObject(source.metadata) ? source.metadata : {},
    ...source
  };
}
