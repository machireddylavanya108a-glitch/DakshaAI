import { asArray, isObject, normalizeTimeMs } from './TimelineRuntimeConfig.js';

function mapDependencies(dependencies = []) {
  const byTarget = new Map();

  asArray(dependencies).forEach((dependency) => {
    if (!isObject(dependency)) return;
    const to = String(dependency.to || '').trim();
    if (!to) return;
    if (!byTarget.has(to)) byTarget.set(to, []);
    byTarget.get(to).push({ ...dependency });
  });

  return byTarget;
}

function sortByTimeAndPriority(items = [], timeKey = 'time', priorityKey = 'priority') {
  return [...asArray(items)].sort((a, b) => {
    const aTime = normalizeTimeMs(a?.[timeKey], a?.start || 0);
    const bTime = normalizeTimeMs(b?.[timeKey], b?.start || 0);
    if (aTime !== bTime) return aTime - bTime;

    const aPriority = Number(a?.[priorityKey] || 0);
    const bPriority = Number(b?.[priorityKey] || 0);
    return bPriority - aPriority;
  });
}

function createNodeId(kind, id) {
  return `${kind}:${id}`;
}

export function buildTimelineExecutionPlan(timeline = {}) {
  const sortedClips = sortByTimeAndPriority(timeline.clips, 'start', 'priority');
  const sortedEvents = sortByTimeAndPriority(timeline.events, 'time', 'priority');
  const sortedMarkers = sortByTimeAndPriority(timeline.markers, 'time', 'priority');
  const sortedActions = sortByTimeAndPriority(timeline.actions, 'timeMs', 'priority');
  const dependencies = asArray(timeline.dependencies);
  const dependencyMap = mapDependencies(dependencies);

  const planItems = [];

  sortedClips.forEach((clip) => {
    planItems.push({ kind: 'clip', id: createNodeId('clip', clip.id), timeMs: normalizeTimeMs(clip.start, 0), priority: Number(clip.priority || 0), payload: clip });
  });

  sortedEvents.forEach((event) => {
    planItems.push({ kind: 'event', id: createNodeId('event', event.id), timeMs: normalizeTimeMs(event.time, 0), priority: Number(event.priority || 0), payload: event });
  });

  sortedMarkers.forEach((marker) => {
    planItems.push({ kind: 'marker', id: createNodeId('marker', marker.id), timeMs: normalizeTimeMs(marker.time, 0), priority: Number(marker.priority || 0), payload: marker });
  });

  sortedActions.forEach((action) => {
    planItems.push({ kind: 'action', id: createNodeId('action', action.id), timeMs: normalizeTimeMs(action.timeMs ?? action.time ?? 0, 0), priority: Number(action.priority || 0), payload: action });
  });

  planItems.sort((a, b) => {
    if (a.timeMs !== b.timeMs) return a.timeMs - b.timeMs;
    if (a.priority !== b.priority) return b.priority - a.priority;
    return a.id.localeCompare(b.id);
  });

  return {
    items: planItems,
    dependencyMap,
    dependencies,
    clips: sortedClips,
    events: sortedEvents,
    markers: sortedMarkers,
    actions: sortedActions
  };
}
