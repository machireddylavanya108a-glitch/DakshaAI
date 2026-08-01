import {
  TIMELINE_SCHEMA_LATEST_VERSION,
  normalizeVersion,
  isObject,
  asArray
} from './TimelineConfig.js';

function migrateLegacyStepsToTimeline(stepList = []) {
  const clips = asArray(stepList).map((step, index) => {
    const source = isObject(step) ? step : {};
    const start = Number(source.start ?? source.order ?? index * 1000) || 0;
    const duration = Math.max(0, Number(source.duration ?? source.durationMs ?? 0) || 0);
    const end = Number(source.end ?? start + duration);

    return {
      id: String(source.id || `clip-legacy-${index + 1}`),
      start,
      end,
      duration: Math.max(0, end - start),
      objects: Array.isArray(source.objects) ? source.objects : [],
      actions: [],
      events: [],
      metadata: {
        title: source.title || source.name || `Step ${index + 1}`,
        description: source.description || ''
      }
    };
  });

  return {
    timelineId: 'timeline-legacy',
    version: 'v2',
    tracks: [
      {
        id: 'track-legacy-main',
        name: 'Legacy Timeline',
        purpose: 'legacy',
        priority: 0,
        enabled: true,
        events: [],
        clips,
        markers: [],
        dependencies: [],
        metadata: {}
      }
    ],
    clips,
    events: [],
    actions: [],
    markers: [],
    segments: [],
    groups: [],
    dependencies: [],
    metadata: {
      source: 'legacy-v1'
    },
    diagnostics: {}
  };
}

export function migrateTimelineV1ToV2(timelineInput) {
  if (Array.isArray(timelineInput)) {
    return migrateLegacyStepsToTimeline(timelineInput);
  }

  const source = isObject(timelineInput) ? timelineInput : {};

  if (Array.isArray(source.timeline)) {
    return migrateLegacyStepsToTimeline(source.timeline);
  }

  if (Array.isArray(source.steps)) {
    return migrateLegacyStepsToTimeline(source.steps);
  }

  return {
    ...source,
    version: 'v2'
  };
}

export function migrateTimelineVersion(timelineInput, targetVersion = TIMELINE_SCHEMA_LATEST_VERSION) {
  const source = isObject(timelineInput) || Array.isArray(timelineInput) ? timelineInput : {};
  const sourceVersion = normalizeVersion(source?.version || 'v1');
  const normalizedTarget = normalizeVersion(targetVersion);

  if (sourceVersion === normalizedTarget) {
    return {
      ...(isObject(source) ? source : {}),
      version: normalizedTarget
    };
  }

  if (sourceVersion === 'v1' && normalizedTarget === 'v2') {
    return migrateTimelineV1ToV2(source);
  }

  return {
    ...(isObject(source) ? source : {}),
    version: normalizedTarget
  };
}
