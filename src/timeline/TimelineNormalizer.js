import {
  TIMELINE_SCHEMA_LATEST_VERSION,
  createDeterministicId,
  isObject,
  asArray,
  toFiniteNumber,
  toBoolean
} from './TimelineConfig.js';
import { createSafeTimeline } from './TimelineSchema.js';
import { createTimelineMetadata } from './TimelineMetadata.js';
import { createTimelineDiagnostics } from './TimelineDiagnostics.js';
import { createTimelineTrack } from './TimelineTrack.js';
import { createTimelineClip } from './TimelineClip.js';
import { createTimelineEvent } from './TimelineEvent.js';
import { createTimelineAction } from './TimelineAction.js';
import { createTimelineMarker } from './TimelineMarker.js';

const UNSAFE_KEYS = new Set(['__proto__', 'prototype', 'constructor']);
const UNSAFE_URL_PATTERN = /^(javascript:|vbscript:|data:text\/html)/i;
const UNSAFE_SCRIPT_PATTERN = /<\s*script|\beval\s*\(|\bFunction\s*\(|\bimport\s*\(/i;

function pick(source, keys, fallback = undefined) {
  for (const key of keys) {
    if (source && Object.prototype.hasOwnProperty.call(source, key) && source[key] !== undefined) {
      return source[key];
    }
  }
  return fallback;
}

function sanitizeString(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  if (UNSAFE_URL_PATTERN.test(text)) return '';
  if (UNSAFE_SCRIPT_PATTERN.test(text)) {
    return text
      .replace(/<\s*script[\s\S]*?>[\s\S]*?<\s*\/\s*script>/gi, '')
      .replace(/\beval\s*\([^)]*\)/gi, '')
      .replace(/\bFunction\s*\([^)]*\)/gi, '')
      .replace(/\bimport\s*\([^)]*\)/gi, '')
      .trim();
  }
  return text;
}

function sanitizeValue(value, seen = new WeakSet()) {
  if (value === null || value === undefined) return value;

  if (typeof value === 'function') return undefined;
  if (typeof value === 'bigint') return Number(value);
  if (typeof value === 'string') return sanitizeString(value);
  if (typeof value !== 'object') return value;

  if (seen.has(value)) return '[circular]';
  seen.add(value);

  if (Array.isArray(value)) {
    return value
      .map((item) => sanitizeValue(item, seen))
      .filter((item) => item !== undefined);
  }

  if ('$$typeof' in value) {
    return undefined;
  }

  const output = {};
  Object.entries(value).forEach(([key, nested]) => {
    if (UNSAFE_KEYS.has(key)) return;
    const next = sanitizeValue(nested, seen);
    if (next !== undefined) output[key] = next;
  });

  return output;
}

function dedupeIds(items, prefix, seedPrefix) {
  const list = asArray(items);
  const seen = new Set();

  return list.map((item, index) => {
    const source = isObject(item) ? item : {};
    const fallbackId = createDeterministicId(prefix, `${seedPrefix}|${index}|${JSON.stringify(source)}`);
    const baseId = String(source.id || fallbackId).trim() || fallbackId;
    let nextId = baseId;
    let suffix = 1;

    while (seen.has(nextId)) {
      suffix += 1;
      nextId = `${baseId}-${suffix}`;
    }

    seen.add(nextId);
    return {
      ...source,
      id: nextId
    };
  });
}

function normalizeDependency(raw, index = 0) {
  const source = isObject(raw) ? raw : {};
  return {
    ...source,
    id: String(source.id || createDeterministicId('dependency', `${index}|${JSON.stringify(source)}`)),
    type: String(source.type || source.relation || 'before'),
    from: String(source.from || source.source || ''),
    to: String(source.to || source.target || ''),
    requires: asArray(source.requires),
    blocks: asArray(source.blocks),
    optional: asArray(source.optional),
    parallel: asArray(source.parallel),
    metadata: isObject(source.metadata) ? source.metadata : {}
  };
}

function normalizeAction(raw, index = 0) {
  const source = createTimelineAction(raw);
  return {
    ...source,
    id: String(source.id || createDeterministicId('action', `${index}|${JSON.stringify(source)}`)),
    type: String(source.type || 'custom'),
    purpose: String(source.purpose || 'generic'),
    targets: asArray(source.targets),
    parameters: isObject(source.parameters) ? source.parameters : {},
    metadata: isObject(source.metadata) ? source.metadata : {}
  };
}

function normalizeEvent(raw, index = 0) {
  const source = createTimelineEvent(raw);
  return {
    ...source,
    id: String(source.id || createDeterministicId('event', `${index}|${JSON.stringify(source)}`)),
    type: String(source.type || 'custom'),
    time: toFiniteNumber(source.time, 0),
    targets: asArray(source.targets),
    payload: isObject(source.payload) ? source.payload : {},
    priority: toFiniteNumber(source.priority, 0),
    conditions: asArray(source.conditions),
    effects: asArray(source.effects),
    metadata: isObject(source.metadata) ? source.metadata : {}
  };
}

function normalizeMarker(raw, index = 0) {
  const source = createTimelineMarker(raw);
  return {
    ...source,
    id: String(source.id || createDeterministicId('marker', `${index}|${JSON.stringify(source)}`)),
    type: String(source.type || 'chapter'),
    time: toFiniteNumber(source.time, 0),
    label: String(source.label || source.name || ''),
    metadata: isObject(source.metadata) ? source.metadata : {}
  };
}

function normalizeClip(raw, index = 0) {
  const source = createTimelineClip(raw);
  const start = toFiniteNumber(source.start, 0);
  const end = toFiniteNumber(source.end, start);
  const duration = Number.isFinite(Number(source.duration)) ? Number(source.duration) : Math.max(0, end - start);

  return {
    ...source,
    id: String(source.id || createDeterministicId('clip', `${index}|${JSON.stringify(source)}`)),
    start,
    end,
    duration: Math.max(0, duration),
    objects: asArray(source.objects),
    actions: dedupeIds(asArray(source.actions).map((action, actionIndex) => normalizeAction(action, actionIndex)), 'action', `clip-${index}`),
    events: dedupeIds(asArray(source.events).map((event, eventIndex) => normalizeEvent(event, eventIndex)), 'event', `clip-${index}`),
    metadata: isObject(source.metadata) ? source.metadata : {}
  };
}

function normalizeTrack(raw, index = 0) {
  const source = createTimelineTrack(raw);

  return {
    ...source,
    id: String(source.id || createDeterministicId('track', `${index}|${JSON.stringify(source)}`)),
    name: String(source.name || `Track ${index + 1}`),
    purpose: String(source.purpose || 'generic'),
    priority: toFiniteNumber(source.priority, 0),
    enabled: toBoolean(source.enabled, true),
    events: dedupeIds(asArray(source.events).map((event, eventIndex) => normalizeEvent(event, eventIndex)), 'event', `track-${index}`),
    clips: dedupeIds(asArray(source.clips).map((clip, clipIndex) => normalizeClip(clip, clipIndex)), 'clip', `track-${index}`),
    markers: dedupeIds(asArray(source.markers).map((marker, markerIndex) => normalizeMarker(marker, markerIndex)), 'marker', `track-${index}`),
    dependencies: dedupeIds(asArray(source.dependencies).map((dependency, depIndex) => normalizeDependency(dependency, depIndex)), 'dependency', `track-${index}`),
    metadata: isObject(source.metadata) ? source.metadata : {}
  };
}

function normalizeLegacyTimelineSteps(steps = []) {
  return asArray(steps).map((step, index) => {
    const source = isObject(step) ? step : {};
    const start = toFiniteNumber(pick(source, ['start', 'time', 'order'], index * 1000), 0);
    const duration = Math.max(0, toFiniteNumber(pick(source, ['duration', 'durationMs'], 0), 0));
    const end = toFiniteNumber(source.end, start + duration);

    return {
      id: String(source.id || createDeterministicId('clip-legacy', `${index}|${JSON.stringify(source)}`)),
      start,
      end,
      duration: Math.max(0, end - start),
      objects: asArray(source.objects),
      actions: [],
      events: [],
      metadata: {
        title: String(source.title || source.name || `Step ${index + 1}`),
        description: String(source.description || '')
      }
    };
  });
}

export function normalizeTimeline(timelineInput, options = {}) {
  const start = Date.now();
  const sanitizedInput = sanitizeValue(timelineInput);
  const input = isObject(sanitizedInput) || Array.isArray(sanitizedInput) ? sanitizedInput : {};

  let sourceRoot = {};

  if (Array.isArray(input)) {
    sourceRoot = {
      version: 'v1',
      timeline: input
    };
  } else {
    sourceRoot = input;
  }

  const timelineRoot = isObject(sourceRoot.timeline)
    ? sourceRoot.timeline
    : sourceRoot;

  const hasLegacySteps = Array.isArray(sourceRoot.timeline) || Array.isArray(sourceRoot.steps);
  const legacySteps = hasLegacySteps
    ? normalizeLegacyTimelineSteps(Array.isArray(sourceRoot.timeline) ? sourceRoot.timeline : sourceRoot.steps)
    : [];

  const trackAlias = pick(timelineRoot, ['tracks', 'timelineTracks'], pick(sourceRoot, ['timelineTracks', 'tracks'], []));
  const eventAlias = pick(timelineRoot, ['events', 'timelineEvents'], pick(sourceRoot, ['timelineEvents', 'events'], []));
  const markerAlias = pick(timelineRoot, ['markers', 'timelineMarkers'], pick(sourceRoot, ['timelineMarkers', 'markers'], []));
  const actionAlias = pick(timelineRoot, ['actions', 'timelineActions'], pick(sourceRoot, ['timelineActions', 'actions'], []));
  const clipAlias = pick(timelineRoot, ['clips', 'timelineClips'], pick(sourceRoot, ['timelineClips', 'clips'], []));
  const dependencyAlias = pick(
    timelineRoot,
    ['dependencies', 'timelineDependencies'],
    pick(sourceRoot, ['timelineDependencies', 'dependencies'], [])
  );

  const tracks = dedupeIds(asArray(trackAlias).map((track, index) => normalizeTrack(track, index)), 'track', 'root-track');

  if (!tracks.length && legacySteps.length) {
    tracks.push(normalizeTrack({
      id: 'track-legacy-main',
      name: 'Legacy Timeline',
      purpose: 'legacy',
      clips: legacySteps,
      events: [],
      markers: []
    }, 0));
  }

  const flatTrackClips = tracks.flatMap((track) => asArray(track.clips));
  const flatTrackEvents = tracks.flatMap((track) => asArray(track.events));
  const flatTrackMarkers = tracks.flatMap((track) => asArray(track.markers));
  const flatTrackDependencies = tracks.flatMap((track) => asArray(track.dependencies));

  const clips = dedupeIds([
    ...asArray(clipAlias).map((clip, index) => normalizeClip(clip, index)),
    ...flatTrackClips,
    ...legacySteps
  ], 'clip', 'root-clip');

  const actions = dedupeIds([
    ...asArray(actionAlias).map((action, index) => normalizeAction(action, index)),
    ...clips.flatMap((clip) => asArray(clip.actions))
  ], 'action', 'root-action');

  const events = dedupeIds([
    ...asArray(eventAlias).map((event, index) => normalizeEvent(event, index)),
    ...flatTrackEvents,
    ...clips.flatMap((clip) => asArray(clip.events))
  ], 'event', 'root-event');

  const markers = dedupeIds([
    ...asArray(markerAlias).map((marker, index) => normalizeMarker(marker, index)),
    ...flatTrackMarkers
  ], 'marker', 'root-marker');

  const dependencies = dedupeIds([
    ...asArray(dependencyAlias).map((dependency, index) => normalizeDependency(dependency, index)),
    ...flatTrackDependencies
  ], 'dependency', 'root-dependency');

  const normalized = createSafeTimeline({
    timelineId: String(
      pick(timelineRoot, ['timelineId', 'id'], pick(sourceRoot, ['timelineId', 'id'], createDeterministicId('timeline', JSON.stringify(sourceRoot))))
    ),
    version: String(pick(timelineRoot, ['version'], pick(sourceRoot, ['version'], TIMELINE_SCHEMA_LATEST_VERSION))),
    tracks,
    clips,
    events,
    actions,
    markers,
    segments: asArray(pick(timelineRoot, ['segments'], pick(sourceRoot, ['segments'], []))),
    groups: asArray(pick(timelineRoot, ['groups'], pick(sourceRoot, ['groups'], []))),
    dependencies,
    metadata: createTimelineMetadata({
      ...pick(sourceRoot, ['metadata', 'timelineMetadata'], {}),
      ...pick(timelineRoot, ['metadata'], {}),
      sourceType: options.sourceType || pick(sourceRoot, ['sourceType'], 'unknown')
    }),
    diagnostics: createTimelineDiagnostics({
      normalizationDurationMs: Math.max(0, Date.now() - start)
    })
  });

  return normalized;
}
