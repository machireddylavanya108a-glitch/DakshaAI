import {
  createDeterministicId,
  isObject,
  asArray,
  toFiniteNumber
} from './TimelineConfig.js';
import { createSafeTimeline } from './TimelineSchema.js';
import { createTimelineMetadata } from './TimelineMetadata.js';

function ensureUniqueIds(items, prefix, seedPrefix, repairs) {
  const seen = new Set();
  return asArray(items).map((item, index) => {
    const source = isObject(item) ? { ...item } : {};
    if (!source.id) {
      source.id = createDeterministicId(prefix, `${seedPrefix}|missing|${index}|${JSON.stringify(source)}`);
      repairs.push(`Generated missing ${prefix} id at index ${index}.`);
    }

    const originalId = String(source.id || '').trim();
    let nextId = originalId || createDeterministicId(prefix, `${seedPrefix}|empty|${index}`);
    let suffix = 1;
    while (seen.has(nextId)) {
      suffix += 1;
      nextId = `${originalId || prefix}-${suffix}`;
    }

    if (nextId !== originalId) {
      repairs.push(`Deduplicated ${prefix} id ${originalId || '(empty)'} -> ${nextId}.`);
    }

    source.id = nextId;
    seen.add(nextId);
    return source;
  });
}

function repairClip(clip, index, repairs) {
  const source = isObject(clip) ? { ...clip } : {};
  const start = Math.max(0, toFiniteNumber(source.start, 0));
  const endCandidate = toFiniteNumber(source.end, start);
  const end = Math.max(start, endCandidate);

  let duration = toFiniteNumber(source.duration, end - start);
  if (duration < 0) {
    repairs.push(`Clip ${source.id || index} had negative duration and was clamped.`);
    duration = 0;
  }

  if (start !== toFiniteNumber(source.start, 0)) {
    repairs.push(`Clip ${source.id || index} start was repaired.`);
  }

  if (end !== toFiniteNumber(source.end, start)) {
    repairs.push(`Clip ${source.id || index} end was repaired.`);
  }

  return {
    ...source,
    start,
    end,
    duration: Number.isFinite(duration) ? duration : Math.max(0, end - start),
    objects: asArray(source.objects),
    actions: asArray(source.actions),
    events: asArray(source.events),
    metadata: isObject(source.metadata) ? source.metadata : {}
  };
}

function repairEvent(event, index, repairs) {
  const source = isObject(event) ? { ...event } : {};
  const nextTime = Math.max(0, toFiniteNumber(source.time, 0));
  if (nextTime !== toFiniteNumber(source.time, 0)) {
    repairs.push(`Event ${source.id || index} negative/invalid time repaired.`);
  }

  return {
    ...source,
    time: nextTime,
    targets: asArray(source.targets),
    conditions: asArray(source.conditions),
    effects: asArray(source.effects),
    payload: isObject(source.payload) ? source.payload : {},
    metadata: isObject(source.metadata) ? source.metadata : {}
  };
}

function repairAction(action) {
  const source = isObject(action) ? { ...action } : {};
  return {
    ...source,
    targets: asArray(source.targets),
    parameters: isObject(source.parameters) ? source.parameters : {},
    metadata: isObject(source.metadata) ? source.metadata : {}
  };
}

function repairMarker(marker, index, repairs) {
  const source = isObject(marker) ? { ...marker } : {};
  const nextTime = Math.max(0, toFiniteNumber(source.time, 0));
  if (nextTime !== toFiniteNumber(source.time, 0)) {
    repairs.push(`Marker ${source.id || index} negative/invalid time repaired.`);
  }

  return {
    ...source,
    time: nextTime,
    metadata: isObject(source.metadata) ? source.metadata : {}
  };
}

function collectKnownIds(timeline) {
  const ids = new Set();
  ['tracks', 'clips', 'events', 'actions', 'markers'].forEach((key) => {
    asArray(timeline[key]).forEach((item) => {
      const id = String(item?.id || '').trim();
      if (id) ids.add(id);
    });
  });
  return ids;
}

function repairReferences(timeline, repairs) {
  const knownIds = collectKnownIds(timeline);

  timeline.events = asArray(timeline.events).map((event) => {
    const source = { ...event };
    const originalTargets = asArray(source.targets);
    source.targets = originalTargets.filter((target) => {
      const id = String(isObject(target) ? target.id : target || '').trim();
      return id ? knownIds.has(id) : false;
    });

    if (source.targets.length !== originalTargets.length) {
      repairs.push(`Event ${source.id} targets repaired by removing broken references.`);
    }

    return source;
  });

  timeline.dependencies = asArray(timeline.dependencies).map((dependency, index) => {
    const source = isObject(dependency) ? { ...dependency } : {};
    const from = String(source.from || '').trim();
    const to = String(source.to || '').trim();

    if (from && !knownIds.has(from)) {
      source.from = '';
      repairs.push(`Dependency ${source.id || index} source repaired.`);
    }

    if (to && !knownIds.has(to)) {
      source.to = '';
      repairs.push(`Dependency ${source.id || index} target repaired.`);
    }

    source.requires = asArray(source.requires).filter((item) => knownIds.has(String(item || '').trim()));
    source.blocks = asArray(source.blocks).filter((item) => knownIds.has(String(item || '').trim()));
    source.optional = asArray(source.optional).filter((item) => knownIds.has(String(item || '').trim()));
    source.parallel = asArray(source.parallel).filter((item) => knownIds.has(String(item || '').trim()));

    return source;
  });

  return timeline;
}

export function repairTimeline(timelineInput = {}, validation = null) {
  const repairs = [];

  if (!isObject(timelineInput)) {
    const fallback = createSafeTimeline();
    fallback.validation = {
      valid: true,
      status: 'repaired',
      repairable: true,
      errors: [],
      warnings: ['Input timeline was invalid and replaced with a safe timeline.'],
      diagnostics: {}
    };
    return fallback;
  }

  let repaired = {
    ...createSafeTimeline(timelineInput),
    timelineId: String(timelineInput.timelineId || timelineInput.id || createDeterministicId('timeline', JSON.stringify(timelineInput))),
    metadata: createTimelineMetadata(timelineInput.metadata)
  };

  repaired.tracks = ensureUniqueIds(repaired.tracks, 'track', 'timeline-track', repairs).map((track, index) => {
    const next = {
      ...track,
      name: String(track.name || `Track ${index + 1}`),
      purpose: String(track.purpose || 'generic'),
      priority: toFiniteNumber(track.priority, 0),
      enabled: typeof track.enabled === 'boolean' ? track.enabled : true,
      clips: ensureUniqueIds(asArray(track.clips), 'clip', `track-${index}-clip`, repairs).map((clip, clipIndex) => repairClip(clip, clipIndex, repairs)),
      events: ensureUniqueIds(asArray(track.events), 'event', `track-${index}-event`, repairs).map((event, eventIndex) => repairEvent(event, eventIndex, repairs)),
      markers: ensureUniqueIds(asArray(track.markers), 'marker', `track-${index}-marker`, repairs).map((marker, markerIndex) => repairMarker(marker, markerIndex, repairs)),
      dependencies: ensureUniqueIds(asArray(track.dependencies), 'dependency', `track-${index}-dependency`, repairs),
      metadata: isObject(track.metadata) ? track.metadata : {}
    };

    if (!isObject(track.metadata)) repairs.push(`Track ${next.id} metadata inserted.`);
    return next;
  });

  repaired.clips = ensureUniqueIds(repaired.clips, 'clip', 'timeline-clip', repairs).map((clip, index) => repairClip(clip, index, repairs));
  repaired.events = ensureUniqueIds(repaired.events, 'event', 'timeline-event', repairs).map((event, index) => repairEvent(event, index, repairs));
  repaired.actions = ensureUniqueIds(repaired.actions, 'action', 'timeline-action', repairs).map((action) => repairAction(action));
  repaired.markers = ensureUniqueIds(repaired.markers, 'marker', 'timeline-marker', repairs).map((marker, index) => repairMarker(marker, index, repairs));
  repaired.dependencies = ensureUniqueIds(repaired.dependencies, 'dependency', 'timeline-dependency', repairs).map((dependency) => ({
    ...dependency,
    type: String(dependency.type || 'before'),
    from: String(dependency.from || ''),
    to: String(dependency.to || ''),
    requires: asArray(dependency.requires),
    blocks: asArray(dependency.blocks),
    optional: asArray(dependency.optional),
    parallel: asArray(dependency.parallel),
    metadata: isObject(dependency.metadata) ? dependency.metadata : {}
  }));

  repaired.segments = asArray(repaired.segments);
  repaired.groups = asArray(repaired.groups);

  repaired.metadata = createTimelineMetadata(repaired.metadata);
  repaired = repairReferences(repaired, repairs);

  repaired.diagnostics = {
    ...(isObject(repaired.diagnostics) ? repaired.diagnostics : {}),
    repairCount: Number(repaired?.diagnostics?.repairCount || 0) + repairs.length,
    notes: [...asArray(repaired?.diagnostics?.notes), ...repairs]
  };

  repaired.validation = {
    valid: (validation?.errors || []).length === 0,
    status: (validation?.errors || []).length > 0 ? 'repaired' : validation?.status || 'valid',
    repairable: true,
    errors: asArray(validation?.errors),
    warnings: [...asArray(validation?.warnings), ...repairs],
    diagnostics: validation?.diagnostics || {}
  };

  return repaired;
}
