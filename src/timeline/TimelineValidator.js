import {
  TIMELINE_SCHEMA_REQUIRED_KEYS,
  createSafeTimeline
} from './TimelineSchema.js';
import {
  KNOWN_MARKER_TYPES,
  KNOWN_DEPENDENCY_TYPES,
  isObject,
  asArray,
  toFiniteNumber
} from './TimelineConfig.js';

function createResult(errors = [], warnings = [], diagnostics = {}, repairable = true) {
  return {
    valid: errors.length === 0,
    status: errors.length > 0 ? 'invalid' : warnings.length > 0 ? 'warning' : 'valid',
    errors,
    warnings,
    diagnostics,
    repairable
  };
}

function validateTrack(track, index, diagnostics) {
  const errors = [];
  const warnings = [];

  if (!isObject(track)) {
    errors.push(`Track at index ${index} is invalid.`);
    return { errors, warnings };
  }

  if (!String(track.id || '').trim()) errors.push(`Track ${index} is missing id.`);
  if (!String(track.name || '').trim()) warnings.push(`Track ${index} is missing name.`);
  if (!String(track.purpose || '').trim()) warnings.push(`Track ${index} is missing purpose.`);
  if (!Array.isArray(track.events)) errors.push(`Track ${index} events must be an array.`);
  if (!Array.isArray(track.clips)) errors.push(`Track ${index} clips must be an array.`);
  if (!Array.isArray(track.markers)) errors.push(`Track ${index} markers must be an array.`);
  if (!Array.isArray(track.dependencies)) errors.push(`Track ${index} dependencies must be an array.`);
  if (!isObject(track.metadata)) warnings.push(`Track ${index} metadata should be an object.`);

  if (!Number.isFinite(Number(track.priority))) warnings.push(`Track ${index} priority should be numeric.`);
  if (typeof track.enabled !== 'boolean') warnings.push(`Track ${index} enabled should be boolean.`);

  diagnostics.trackCount += 1;
  return { errors, warnings };
}

function validateClip(clip, index, diagnostics) {
  const errors = [];
  const warnings = [];

  if (!isObject(clip)) {
    errors.push(`Clip at index ${index} is invalid.`);
    return { errors, warnings };
  }

  if (!String(clip.id || '').trim()) errors.push(`Clip ${index} is missing id.`);
  if (!Number.isFinite(Number(clip.start))) errors.push(`Clip ${index} start must be numeric.`);
  if (!Number.isFinite(Number(clip.end))) errors.push(`Clip ${index} end must be numeric.`);
  if (!Number.isFinite(Number(clip.duration))) errors.push(`Clip ${index} duration must be numeric.`);
  if (toFiniteNumber(clip.start, 0) < 0) errors.push(`Clip ${index} start cannot be negative.`);
  if (toFiniteNumber(clip.end, 0) < 0) errors.push(`Clip ${index} end cannot be negative.`);
  if (toFiniteNumber(clip.duration, 0) < 0) errors.push(`Clip ${index} duration cannot be negative.`);

  if (!Array.isArray(clip.objects)) errors.push(`Clip ${index} objects must be an array.`);
  if (!Array.isArray(clip.actions)) errors.push(`Clip ${index} actions must be an array.`);
  if (!Array.isArray(clip.events)) errors.push(`Clip ${index} events must be an array.`);
  if (!isObject(clip.metadata)) warnings.push(`Clip ${index} metadata should be an object.`);

  diagnostics.clipCount += 1;
  return { errors, warnings };
}

function validateEvent(event, index, diagnostics) {
  const errors = [];
  const warnings = [];

  if (!isObject(event)) {
    errors.push(`Event at index ${index} is invalid.`);
    return { errors, warnings };
  }

  if (!String(event.id || '').trim()) errors.push(`Event ${index} is missing id.`);
  if (!String(event.type || '').trim()) errors.push(`Event ${index} is missing type.`);
  if (!Number.isFinite(Number(event.time))) errors.push(`Event ${index} time must be numeric.`);
  if (toFiniteNumber(event.time, 0) < 0) errors.push(`Event ${index} time cannot be negative.`);
  if (!Array.isArray(event.targets)) errors.push(`Event ${index} targets must be an array.`);
  if (!isObject(event.payload)) warnings.push(`Event ${index} payload should be an object.`);
  if (!Number.isFinite(Number(event.priority))) warnings.push(`Event ${index} priority should be numeric.`);
  if (!Array.isArray(event.conditions)) warnings.push(`Event ${index} conditions should be an array.`);
  if (!Array.isArray(event.effects)) warnings.push(`Event ${index} effects should be an array.`);
  if (!isObject(event.metadata)) warnings.push(`Event ${index} metadata should be an object.`);

  diagnostics.eventCount += 1;
  return { errors, warnings };
}

function validateAction(action, index, diagnostics) {
  const errors = [];
  const warnings = [];

  if (!isObject(action)) {
    errors.push(`Action at index ${index} is invalid.`);
    return { errors, warnings };
  }

  if (!String(action.id || '').trim()) errors.push(`Action ${index} is missing id.`);
  if (!String(action.type || '').trim()) errors.push(`Action ${index} is missing type.`);
  if (!String(action.purpose || '').trim()) warnings.push(`Action ${index} is missing purpose.`);
  if (!Array.isArray(action.targets)) errors.push(`Action ${index} targets must be an array.`);
  if (!isObject(action.parameters)) warnings.push(`Action ${index} parameters should be an object.`);
  if (!isObject(action.metadata)) warnings.push(`Action ${index} metadata should be an object.`);

  diagnostics.actionCount += 1;
  return { errors, warnings };
}

function validateMarker(marker, index, diagnostics) {
  const errors = [];
  const warnings = [];

  if (!isObject(marker)) {
    errors.push(`Marker at index ${index} is invalid.`);
    return { errors, warnings };
  }

  if (!String(marker.id || '').trim()) errors.push(`Marker ${index} is missing id.`);
  if (!String(marker.type || '').trim()) errors.push(`Marker ${index} is missing type.`);
  if (!Number.isFinite(Number(marker.time))) errors.push(`Marker ${index} time must be numeric.`);
  if (toFiniteNumber(marker.time, 0) < 0) errors.push(`Marker ${index} time cannot be negative.`);
  if (!KNOWN_MARKER_TYPES.includes(String(marker.type || ''))) {
    diagnostics.unknownMarkerTypes += 1;
  }
  if (!isObject(marker.metadata)) warnings.push(`Marker ${index} metadata should be an object.`);

  diagnostics.markerCount += 1;
  return { errors, warnings };
}

function validateDependency(dependency, index, knownIds, diagnostics) {
  const errors = [];
  const warnings = [];

  if (!isObject(dependency)) {
    errors.push(`Dependency at index ${index} is invalid.`);
    return { errors, warnings };
  }

  const type = String(dependency.type || 'before');
  const from = String(dependency.from || '');
  const to = String(dependency.to || '');

  if (!String(dependency.id || '').trim()) warnings.push(`Dependency ${index} is missing id.`);
  if (!from || !to) warnings.push(`Dependency ${index} should include from and to.`);
  if (from && !knownIds.has(from)) errors.push(`Dependency ${index} has unknown source ${from}.`);
  if (to && !knownIds.has(to)) errors.push(`Dependency ${index} has unknown target ${to}.`);
  if (!KNOWN_DEPENDENCY_TYPES.includes(type)) diagnostics.unknownDependencyTypes += 1;

  diagnostics.dependencyCount += 1;
  return { errors, warnings };
}

function collectKnownIds(timeline) {
  const ids = new Set();

  const collect = (items) => {
    asArray(items).forEach((item) => {
      if (!isObject(item)) return;
      const id = String(item.id || '').trim();
      if (id) ids.add(id);
    });
  };

  collect(timeline.tracks);
  collect(timeline.clips);
  collect(timeline.events);
  collect(timeline.actions);
  collect(timeline.markers);

  asArray(timeline.tracks).forEach((track) => {
    collect(track?.clips);
    collect(track?.events);
    collect(track?.markers);
  });

  return ids;
}

export function validateTimeline(timelineInput = {}) {
  const errors = [];
  const warnings = [];
  const diagnostics = {
    trackCount: 0,
    clipCount: 0,
    eventCount: 0,
    actionCount: 0,
    markerCount: 0,
    dependencyCount: 0,
    unknownMarkerTypes: 0,
    unknownDependencyTypes: 0
  };

  const timeline = isObject(timelineInput) ? timelineInput : createSafeTimeline();

  TIMELINE_SCHEMA_REQUIRED_KEYS.forEach((key) => {
    if (!(key in timeline)) errors.push(`Timeline is missing required field ${key}.`);
  });

  if (!isObject(timeline.metadata)) warnings.push('Timeline metadata should be an object.');
  if (!isObject(timeline.diagnostics)) warnings.push('Timeline diagnostics should be an object.');

  asArray(timeline.tracks).forEach((track, index) => {
    const result = validateTrack(track, index, diagnostics);
    errors.push(...result.errors);
    warnings.push(...result.warnings);
  });

  asArray(timeline.clips).forEach((clip, index) => {
    const result = validateClip(clip, index, diagnostics);
    errors.push(...result.errors);
    warnings.push(...result.warnings);
  });

  asArray(timeline.events).forEach((event, index) => {
    const result = validateEvent(event, index, diagnostics);
    errors.push(...result.errors);
    warnings.push(...result.warnings);
  });

  asArray(timeline.actions).forEach((action, index) => {
    const result = validateAction(action, index, diagnostics);
    errors.push(...result.errors);
    warnings.push(...result.warnings);
  });

  asArray(timeline.markers).forEach((marker, index) => {
    const result = validateMarker(marker, index, diagnostics);
    errors.push(...result.errors);
    warnings.push(...result.warnings);
  });

  const knownIds = collectKnownIds(timeline);
  asArray(timeline.dependencies).forEach((dependency, index) => {
    const result = validateDependency(dependency, index, knownIds, diagnostics);
    errors.push(...result.errors);
    warnings.push(...result.warnings);
  });

  return createResult(errors, warnings, diagnostics, true);
}
