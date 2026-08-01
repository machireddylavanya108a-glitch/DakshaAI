import { isObject, asArray, createDeterministicId } from './TimelineConfig.js';

function createResult(errors = [], warnings = []) {
  return {
    status: errors.length > 0 ? 'invalid' : warnings.length > 0 ? 'warning' : 'valid',
    errors,
    warnings,
    repairable: true
  };
}

function collectIds(timeline = {}) {
  const ids = new Set();

  const collect = (items, prefix) => {
    asArray(items).forEach((item, index) => {
      if (!isObject(item)) return;
      const id = String(item.id || '').trim() || createDeterministicId(prefix, `${index}`);
      ids.add(id);
    });
  };

  collect(timeline.tracks, 'track');
  collect(timeline.clips, 'clip');
  collect(timeline.events, 'event');
  collect(timeline.actions, 'action');
  collect(timeline.markers, 'marker');

  asArray(timeline.tracks).forEach((track, trackIndex) => {
    if (!isObject(track)) return;
    collect(track.clips, `track-${trackIndex}-clip`);
    collect(track.events, `track-${trackIndex}-event`);
    collect(track.markers, `track-${trackIndex}-marker`);
  });

  return ids;
}

function detectDependencyCycle(dependencies = []) {
  const adjacency = new Map();

  asArray(dependencies).forEach((dependency) => {
    if (!isObject(dependency)) return;
    const from = String(dependency.from || '').trim();
    const to = String(dependency.to || '').trim();
    const type = String(dependency.type || '').trim().toLowerCase();
    if (!from || !to) return;
    if (type && type !== 'before' && type !== 'after') return;

    if (!adjacency.has(from)) adjacency.set(from, []);
    adjacency.get(from).push(to);
  });

  const visiting = new Set();
  const visited = new Set();
  const cycles = [];

  function dfs(nodeId, path = []) {
    if (visiting.has(nodeId)) {
      cycles.push([...path, nodeId]);
      return;
    }
    if (visited.has(nodeId)) return;

    visiting.add(nodeId);
    const children = adjacency.get(nodeId) || [];
    children.forEach((child) => dfs(child, [...path, nodeId]));
    visiting.delete(nodeId);
    visited.add(nodeId);
  }

  adjacency.forEach((_value, key) => dfs(key));
  return cycles;
}

export function runTimelineIntegrityChecks(timelineInput = {}) {
  const timeline = isObject(timelineInput) ? timelineInput : {};
  const errors = [];
  const warnings = [];

  const ids = collectIds(timeline);

  asArray(timeline.dependencies).forEach((dependency, index) => {
    if (!isObject(dependency)) {
      warnings.push(`Dependency ${index} is invalid.`);
      return;
    }

    const from = String(dependency.from || '').trim();
    const to = String(dependency.to || '').trim();
    if (!from || !to) {
      warnings.push(`Dependency ${index} is missing from/to.`);
      return;
    }

    if (!ids.has(from)) errors.push(`Dependency ${index} references missing source ${from}.`);
    if (!ids.has(to)) errors.push(`Dependency ${index} references missing target ${to}.`);
  });

  const cycles = detectDependencyCycle(timeline.dependencies);
  cycles.forEach((cycle) => warnings.push(`Dependency cycle detected: ${cycle.join(' -> ')}`));

  return createResult(errors, warnings);
}
