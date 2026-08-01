import { TIMELINE_SCHEMA_LATEST_VERSION, isObject } from './TimelineConfig.js';
import { createTimelineMetadata } from './TimelineMetadata.js';
import { createTimelineDiagnostics } from './TimelineDiagnostics.js';

export const TIMELINE_SCHEMA_REQUIRED_KEYS = [
  'timelineId',
  'version',
  'tracks',
  'clips',
  'events',
  'actions',
  'markers',
  'segments',
  'groups',
  'dependencies',
  'metadata',
  'diagnostics'
];

export function createSafeTimeline(overrides = {}) {
  const source = isObject(overrides) ? overrides : {};
  return {
    timelineId: source.timelineId || '',
    version: source.version || TIMELINE_SCHEMA_LATEST_VERSION,
    tracks: Array.isArray(source.tracks) ? source.tracks : [],
    clips: Array.isArray(source.clips) ? source.clips : [],
    events: Array.isArray(source.events) ? source.events : [],
    actions: Array.isArray(source.actions) ? source.actions : [],
    markers: Array.isArray(source.markers) ? source.markers : [],
    segments: Array.isArray(source.segments) ? source.segments : [],
    groups: Array.isArray(source.groups) ? source.groups : [],
    dependencies: Array.isArray(source.dependencies) ? source.dependencies : [],
    metadata: createTimelineMetadata(source.metadata),
    diagnostics: createTimelineDiagnostics(source.diagnostics),
    validation: {
      valid: true,
      repairable: true,
      errors: [],
      warnings: [],
      diagnostics: {}
    },
    ...source
  };
}
