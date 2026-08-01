import { isObject, asArray } from './TimelineConfig.js';
import { processTimelineDataPipeline } from './TimelineVersionManager.js';

function buildLegacyTimelineFromSceneSteps(steps = []) {
  return asArray(steps).map((step, index) => {
    const source = isObject(step) ? step : {};
    return {
      id: source.id || `step-${index + 1}`,
      start: Number(source.start ?? source.order ?? index * 1000) || 0,
      end: Number(source.end ?? (Number(source.start ?? source.order ?? index * 1000) || 0) + (Number(source.duration || 0) || 0)),
      duration: Number(source.duration || 0) || 0,
      objects: Array.isArray(source.objects) ? source.objects : [],
      metadata: {
        title: source.title || source.name || `Step ${index + 1}`,
        description: source.description || ''
      }
    };
  });
}

function sourceTimelineRoot(scene = {}) {
  const source = isObject(scene) ? scene : {};

  const timelineObject = isObject(source.timeline)
    ? source.timeline
    : isObject(source.timelineData)
      ? source.timelineData
      : {};

  const sceneTimelineSteps = Array.isArray(source.timeline)
    ? source.timeline
    : Array.isArray(source.steps)
      ? source.steps
      : [];

  const timelineTracks = Array.isArray(source.timelineTracks)
    ? source.timelineTracks
    : Array.isArray(timelineObject.tracks)
      ? timelineObject.tracks
      : [];

  const timelineEvents = Array.isArray(source.timelineEvents)
    ? source.timelineEvents
    : Array.isArray(timelineObject.events)
      ? timelineObject.events
      : [];

  const timelineMarkers = Array.isArray(source.timelineMarkers)
    ? source.timelineMarkers
    : Array.isArray(timelineObject.markers)
      ? timelineObject.markers
      : [];

  const timelineDependencies = Array.isArray(source.timelineDependencies)
    ? source.timelineDependencies
    : Array.isArray(timelineObject.dependencies)
      ? timelineObject.dependencies
      : [];

  return {
    timelineId: timelineObject.timelineId || source.timelineId || source.sceneId || source.id,
    version: timelineObject.version || source.version || 'v2',
    tracks: timelineTracks,
    clips: Array.isArray(timelineObject.clips) ? timelineObject.clips : buildLegacyTimelineFromSceneSteps(sceneTimelineSteps),
    events: timelineEvents,
    actions: Array.isArray(source.timelineActions)
      ? source.timelineActions
      : Array.isArray(timelineObject.actions)
        ? timelineObject.actions
        : [],
    markers: timelineMarkers,
    segments: Array.isArray(source.timelineSegments)
      ? source.timelineSegments
      : Array.isArray(timelineObject.segments)
        ? timelineObject.segments
        : [],
    groups: Array.isArray(source.timelineGroups)
      ? source.timelineGroups
      : Array.isArray(timelineObject.groups)
        ? timelineObject.groups
        : [],
    dependencies: timelineDependencies,
    metadata: {
      ...(isObject(source.metadata) ? source.metadata : {}),
      ...(isObject(timelineObject.metadata) ? timelineObject.metadata : {}),
      sceneId: source.sceneId || null
    }
  };
}

export function buildTimeline(scene = {}) {
  const root = sourceTimelineRoot(scene);
  return processTimelineDataPipeline(root, {
    sourceType: 'scene-builder'
  });
}
