import { asArray, isObject, normalizeEventTimeMs } from './SceneEventConfig.js';
import { validateSceneEvents } from './SceneEventValidator.js';
import { rankSceneEvents } from './SceneEventPriority.js';

function safeTimeline(runtimeScene = {}) {
  return isObject(runtimeScene?.metadata?.timelineData)
    ? runtimeScene.metadata.timelineData
    : isObject(runtimeScene?.metadata?.timeline)
      ? runtimeScene.metadata.timeline
      : {};
}

function getGraphNodes(runtimeScene = {}) {
  const nodes = runtimeScene?.graph?.toJSON?.()?.nodes;
  return Array.isArray(nodes) ? nodes : [];
}

function collectTimelineEvents(runtimeScene = {}) {
  const timeline = safeTimeline(runtimeScene);
  return asArray(timeline.events).map((event, index) => ({
    ...(isObject(event) ? event : {}),
    id: event?.id || `timeline-event-${index + 1}`,
    sourceRefId: event?.id || `timeline-event-${index + 1}`,
    source: 'timeline-event'
  }));
}

function collectTimelineMarkers(runtimeScene = {}) {
  const timeline = safeTimeline(runtimeScene);
  return asArray(timeline.markers).map((marker, index) => ({
    ...(isObject(marker) ? marker : {}),
    id: marker?.id || `timeline-marker-${index + 1}`,
    type: marker?.type || 'marker',
    timeMs: normalizeEventTimeMs(marker?.timeMs ?? marker?.time, 0),
    payload: {
      marker: isObject(marker) ? marker : {}
    },
    sourceRefId: marker?.id || `timeline-marker-${index + 1}`,
    source: 'timeline-marker'
  }));
}

function collectInteractionEvents(runtimeScene = {}) {
  const graphNodes = getGraphNodes(runtimeScene);
  return graphNodes
    .filter((node) => String(node?.metadata?.sourceKey || '').toLowerCase() === 'interactions')
    .map((node, index) => ({
      id: node?.id || `graph-interaction-${index + 1}`,
      type: String(node?.properties?.eventType || node?.properties?.type || 'interaction').trim() || 'interaction',
      timeMs: normalizeEventTimeMs(node?.properties?.timeMs ?? node?.properties?.time ?? node?.metadata?.index, 0),
      priority: Number(node?.properties?.priority || 0),
      targets: asArray(node?.properties?.targetObjectId),
      payload: {
        interaction: isObject(node?.properties) ? node.properties : {}
      },
      metadata: {
        graphNodeId: node?.id || null,
        sourceKey: node?.metadata?.sourceKey || 'interactions'
      },
      sourceRefId: node?.id || `graph-interaction-${index + 1}`,
      source: 'graph-interaction'
    }));
}

export function buildSceneEventSchedule(runtimeScene = {}) {
  const timelineEvents = collectTimelineEvents(runtimeScene);
  const markerEvents = collectTimelineMarkers(runtimeScene);
  const interactionEvents = collectInteractionEvents(runtimeScene);

  const all = [...timelineEvents, ...markerEvents, ...interactionEvents];
  const validation = validateSceneEvents(all, { source: 'timeline-event' });
  const ranked = rankSceneEvents(validation.events || []);

  return {
    events: ranked,
    validation,
    summary: {
      total: ranked.length,
      timelineEvents: timelineEvents.length,
      markerEvents: markerEvents.length,
      interactionEvents: interactionEvents.length
    }
  };
}
