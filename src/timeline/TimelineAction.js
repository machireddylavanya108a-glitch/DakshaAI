import { isObject } from './TimelineConfig.js';

export function createTimelineAction(overrides = {}) {
  const source = isObject(overrides) ? overrides : {};
  return {
    id: source.id || '',
    type: source.type || 'custom',
    purpose: source.purpose || 'generic',
    targets: Array.isArray(source.targets) ? source.targets : [],
    parameters: isObject(source.parameters) ? source.parameters : {},
    metadata: isObject(source.metadata) ? source.metadata : {},
    ...source
  };
}
