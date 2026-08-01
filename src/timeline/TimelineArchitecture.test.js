import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createSafeTimeline,
  normalizeTimeline,
  validateTimeline,
  repairTimeline,
  migrateTimelineVersion,
  processTimelineDataPipeline,
  serializeTimeline,
  deserializeTimeline,
  deepCloneTimeline,
  exportTimeline,
  importTimeline,
  buildTimeline,
  runTimelineIntegrityChecks,
  createDeterministicId
} from './index.js';
import { normalizeScene } from '../scene-generator/SceneNormalizer.js';
import { repairScene } from '../scene-generator/SceneRepair.js';
import { validateScene } from '../scene-generator/SceneValidator.js';
import { processSceneJsonPipeline } from '../scene-generator/SceneVersionManager.js';
import { buildRuntimeSceneGraph } from '../scene-builder/SceneBuilder.js';

function baseTimeline(overrides = {}) {
  return {
    timelineId: 'timeline-1',
    version: 'v2',
    tracks: [
      {
        id: 'track-1',
        name: 'Main',
        purpose: 'explain',
        priority: 1,
        enabled: true,
        events: [{ id: 'event-track-1', type: 'custom', time: 0, targets: ['clip-1'], payload: {}, priority: 0, conditions: [], effects: [], metadata: {} }],
        clips: [{ id: 'clip-1', start: 0, end: 5, duration: 5, objects: ['obj-1'], actions: [], events: [], metadata: {} }],
        markers: [{ id: 'marker-track-1', type: 'chapter', time: 0, label: 'Start', metadata: {} }],
        dependencies: [{ id: 'dep-track-1', type: 'before', from: 'clip-1', to: 'event-1', metadata: {} }],
        metadata: {}
      }
    ],
    clips: [{ id: 'clip-1', start: 0, end: 5, duration: 5, objects: ['obj-1'], actions: [], events: [], metadata: {} }],
    events: [{ id: 'event-1', type: 'custom', time: 1, targets: ['clip-1'], payload: {}, priority: 0, conditions: [], effects: [], metadata: {} }],
    actions: [{ id: 'action-1', type: 'custom', purpose: 'explain', targets: ['clip-1'], parameters: {}, metadata: {} }],
    markers: [{ id: 'marker-1', type: 'chapter', time: 0, label: 'Intro', metadata: {} }],
    segments: [],
    groups: [],
    dependencies: [{ id: 'dep-1', type: 'before', from: 'clip-1', to: 'event-1', metadata: {} }],
    metadata: { source: 'test', tags: ['timeline'] },
    diagnostics: {},
    ...overrides
  };
}

test('1 normalize handles non-object input', () => {
  const normalized = normalizeTimeline(null);
  assert.ok(normalized.timelineId);
  assert.ok(Array.isArray(normalized.tracks));
});

test('2 normalize maps timeline aliases', () => {
  const normalized = normalizeTimeline({
    timelineTracks: [{ id: 't-a', name: 'A', purpose: 'unknown' }],
    timelineEvents: [{ id: 'e-a', type: 'x', time: 1, targets: [] }],
    timelineMarkers: [{ id: 'm-a', type: 'focus', time: 2 }]
  });

  assert.equal(normalized.tracks.length, 1);
  assert.equal(normalized.events.length, 1);
  assert.equal(normalized.markers.length, 1);
});

test('3 normalize strips function values', () => {
  const normalized = normalizeTimeline({
    tracks: [{ id: 't1', name: 'A', purpose: 'x', metadata: { fn: () => {} } }]
  });

  assert.equal(typeof normalized.tracks[0].metadata.fn, 'undefined');
});

test('4 normalize strips script blocks', () => {
  const normalized = normalizeTimeline({
    metadata: { note: '<script>alert(1)</script>safe' }
  });

  assert.equal(String(normalized.metadata.note).includes('<script>'), false);
});

test('5 normalize strips unsafe urls', () => {
  const normalized = normalizeTimeline({ metadata: { href: 'javascript:alert(1)' } });
  assert.equal(normalized.metadata.href, '');
});

test('6 normalize removes eval strings', () => {
  const normalized = normalizeTimeline({ metadata: { note: 'eval(alert(1))' } });
  assert.equal(String(normalized.metadata.note).includes('eval('), false);
});

test('7 normalize removes Function constructor strings', () => {
  const normalized = normalizeTimeline({ metadata: { note: 'Function("return 1")' } });
  assert.equal(String(normalized.metadata.note).includes('Function('), false);
});

test('8 normalize removes dynamic import strings', () => {
  const normalized = normalizeTimeline({ metadata: { note: 'import("x")' } });
  assert.equal(String(normalized.metadata.note).includes('import('), false);
});

test('9 normalize prevents prototype pollution keys', () => {
  const normalized = normalizeTimeline({ metadata: { __proto__: { polluted: true } } });
  assert.equal(({}).polluted, undefined);
  assert.equal(Object.prototype.hasOwnProperty.call(normalized.metadata, '__proto__'), false);
});

test('10 normalize handles circular input safely', () => {
  const circular = {};
  circular.self = circular;
  const normalized = normalizeTimeline(circular);
  assert.ok(normalized);
});

test('11 normalize deduplicates track ids', () => {
  const normalized = normalizeTimeline({ tracks: [{ id: 'track' }, { id: 'track' }] });
  assert.notEqual(normalized.tracks[0].id, normalized.tracks[1].id);
});

test('12 normalize deduplicates clip ids', () => {
  const normalized = normalizeTimeline({ clips: [{ id: 'clip' }, { id: 'clip' }] });
  assert.notEqual(normalized.clips[0].id, normalized.clips[1].id);
});

test('13 unknown event type remains valid', () => {
  const validation = validateTimeline(baseTimeline({
    events: [{ id: 'event-1', type: 'future-event', time: 0, targets: ['clip-1'], payload: {}, priority: 0, conditions: [], effects: [], metadata: {} }],
    dependencies: [{ id: 'dep-1', type: 'before', from: 'clip-1', to: 'event-1', metadata: {} }]
  }));
  assert.equal(validation.valid, true);
});

test('14 unknown track purpose remains valid', () => {
  const validation = validateTimeline(baseTimeline({ tracks: [{ id: 't1', name: 'x', purpose: 'quantum-future-purpose', enabled: true, events: [], clips: [], markers: [], dependencies: [], metadata: {} }] }));
  assert.equal(validation.valid, true);
});

test('15 unknown marker type remains valid', () => {
  const validation = validateTimeline(baseTimeline({ markers: [{ id: 'm1', type: 'future-marker', time: 0, metadata: {} }] }));
  assert.equal(validation.valid, true);
  assert.ok(validation.diagnostics.unknownMarkerTypes >= 1);
});

test('16 validates valid timeline payload', () => {
  const validation = validateTimeline(baseTimeline());
  assert.equal(validation.valid, true);
});

test('17 validates missing track id', () => {
  const validation = validateTimeline(baseTimeline({ tracks: [{ name: 'x', purpose: 'x', enabled: true, events: [], clips: [], markers: [], dependencies: [], metadata: {} }] }));
  assert.equal(validation.valid, false);
});

test('18 validates negative clip times', () => {
  const validation = validateTimeline(baseTimeline({ clips: [{ id: 'c1', start: -1, end: 2, duration: 3, objects: [], actions: [], events: [], metadata: {} }] }));
  assert.equal(validation.valid, false);
});

test('19 validates missing event time', () => {
  const validation = validateTimeline(baseTimeline({ events: [{ id: 'e1', type: 'x', targets: [], payload: {}, priority: 0, conditions: [], effects: [], metadata: {} }] }));
  assert.equal(validation.valid, false);
});

test('20 validation includes diagnostics object', () => {
  const validation = validateTimeline(baseTimeline());
  assert.ok(validation.diagnostics);
  assert.ok(Number.isFinite(validation.diagnostics.trackCount));
});

test('21 repair generates missing ids', () => {
  const repaired = repairTimeline(baseTimeline({ clips: [{ start: 0, end: 1, duration: 1, objects: [], actions: [], events: [], metadata: {} }] }));
  assert.ok(repaired.clips[0].id);
});

test('22 repair deduplicates ids', () => {
  const repaired = repairTimeline(baseTimeline({ clips: [{ id: 'dup', start: 0, end: 1, duration: 1 }, { id: 'dup', start: 2, end: 3, duration: 1 }] }));
  assert.notEqual(repaired.clips[0].id, repaired.clips[1].id);
});

test('23 repair clamps negative clip start', () => {
  const repaired = repairTimeline(baseTimeline({ clips: [{ id: 'c1', start: -3, end: -1, duration: -2 }] }));
  assert.equal(repaired.clips[0].start >= 0, true);
  assert.equal(repaired.clips[0].end >= repaired.clips[0].start, true);
});

test('24 repair clamps negative event time', () => {
  const repaired = repairTimeline(baseTimeline({ events: [{ id: 'e1', type: 'x', time: -10, targets: [] }] }));
  assert.equal(repaired.events[0].time, 0);
});

test('25 repair inserts metadata when missing', () => {
  const repaired = repairTimeline(baseTimeline({ metadata: null }));
  assert.ok(repaired.metadata.createdAt);
});

test('26 repair preserves unknown fields', () => {
  const repaired = repairTimeline(baseTimeline({ metadata: { futureFlag: 'yes' } }));
  assert.equal(repaired.metadata.futureFlag, 'yes');
});

test('27 repair removes broken event target refs', () => {
  const repaired = repairTimeline(baseTimeline({ events: [{ id: 'e1', type: 'x', time: 0, targets: ['missing-target'] }] }));
  assert.equal(repaired.events[0].targets.length, 0);
});

test('28 repair fixes broken dependencies', () => {
  const repaired = repairTimeline(baseTimeline({ dependencies: [{ id: 'd1', type: 'before', from: 'missing', to: 'missing2' }] }));
  assert.equal(repaired.dependencies[0].from, '');
  assert.equal(repaired.dependencies[0].to, '');
});

test('29 migration from v1 timeline steps', () => {
  const migrated = migrateTimelineVersion([{ id: 'step-1', order: 0, duration: 2 }], 'v2');
  assert.equal(migrated.version, 'v2');
  assert.ok(Array.isArray(migrated.tracks));
});

test('30 migration handles numeric version', () => {
  const migrated = migrateTimelineVersion({ version: 1, timeline: [] }, 'v2');
  assert.equal(migrated.version, 'v2');
});

test('31 migration keeps forward compatibility', () => {
  const migrated = migrateTimelineVersion({ version: 'v77', custom: true }, 'v99');
  assert.equal(migrated.version, 'v99');
  assert.equal(migrated.custom, true);
});

test('32 process pipeline returns latest version', () => {
  const result = processTimelineDataPipeline(baseTimeline({ version: 'v1' }));
  assert.equal(result.version, 'v2');
});

test('33 process pipeline returns validation block', () => {
  const result = processTimelineDataPipeline(baseTimeline());
  assert.ok(result.validation);
  assert.equal(typeof result.validation.valid, 'boolean');
});

test('34 serializeTimeline returns json string', () => {
  const serialized = serializeTimeline(baseTimeline());
  assert.equal(typeof serialized, 'string');
  assert.ok(serialized.includes('tracks'));
});

test('35 deserialize invalid returns safe fallback', () => {
  const parsed = deserializeTimeline('{bad json');
  assert.equal(parsed.validation.status, 'fallback');
});

test('36 deep clone creates detached copy', () => {
  const timeline = processTimelineDataPipeline(baseTimeline());
  const clone = deepCloneTimeline(timeline);
  clone.metadata.source = 'changed';
  assert.notEqual(timeline.metadata.source, clone.metadata.source);
});

test('37 exportTimeline returns mime and extension', () => {
  const exported = exportTimeline(baseTimeline());
  assert.equal(exported.mimeType, 'application/json');
  assert.equal(exported.extension, '.timeline.json');
});

test('38 importTimeline roundtrip works', () => {
  const exported = exportTimeline(baseTimeline());
  const imported = importTimeline(exported.content);
  assert.equal(imported.validation.valid, true);
});

test('39 buildTimeline from legacy scene.timeline steps', () => {
  const built = buildTimeline({
    sceneId: 'scene-1',
    timeline: [{ id: 'step-1', order: 0, duration: 2, objects: ['o1'] }]
  });

  assert.ok(built.clips.length >= 1);
});

test('40 buildTimeline from timelineTracks/events/markers', () => {
  const built = buildTimeline({
    sceneId: 'scene-2',
    timelineTracks: [{ id: 't1', name: 'A', purpose: 'x', enabled: true, events: [], clips: [], markers: [], dependencies: [], metadata: {} }],
    timelineEvents: [{ id: 'e1', type: 'x', time: 1, targets: [] }],
    timelineMarkers: [{ id: 'm1', type: 'section', time: 1 }]
  });

  assert.equal(built.tracks.length, 1);
  assert.equal(built.events.length, 1);
  assert.equal(built.markers.length, 1);
});

test('41 buildTimeline from scene.timeline object', () => {
  const built = buildTimeline({
    sceneId: 'scene-3',
    timeline: {
      timelineId: 'tl-3',
      tracks: [{ id: 't1', name: 'A', purpose: 'x', enabled: true, events: [], clips: [], markers: [], dependencies: [], metadata: {} }]
    }
  });

  assert.equal(built.timelineId.length > 0, true);
  assert.equal(built.tracks.length, 1);
});

test('42 buildTimeline preserves unknown event types', () => {
  const built = buildTimeline({ timelineEvents: [{ id: 'e1', type: 'unknown-future-event', time: 0, targets: [] }] });
  assert.equal(built.events[0].type, 'unknown-future-event');
});

test('43 deterministic ids for same input', () => {
  const one = normalizeTimeline({ clips: [{ start: 0, end: 1, duration: 1 }] });
  const two = normalizeTimeline({ clips: [{ start: 0, end: 1, duration: 1 }] });
  assert.equal(one.clips[0].id, two.clips[0].id);
});

test('44 deterministic id helper is stable', () => {
  assert.equal(createDeterministicId('x', 'seed'), createDeterministicId('x', 'seed'));
});

test('45 scene normalizer outputs timeline architecture aliases', () => {
  const normalized = normalizeScene({
    timelineTracks: [{ id: 't1', name: 'A', purpose: 'x', enabled: true, events: [], clips: [], markers: [], dependencies: [], metadata: {} }],
    timelineEvents: [{ id: 'e1', type: 'x', time: 0, targets: [] }],
    timelineMarkers: [{ id: 'm1', type: 'chapter', time: 0 }]
  });

  assert.equal(Array.isArray(normalized.timelineTracks), true);
  assert.equal(Array.isArray(normalized.timelineEvents), true);
  assert.equal(Array.isArray(normalized.timelineMarkers), true);
  assert.ok(normalized.timelineData);
});

test('46 scene repair hydrates timeline architecture aliases', () => {
  const repaired = repairScene({ title: 'x', timelineTracks: null, timelineEvents: null, timelineMarkers: null });
  assert.equal(Array.isArray(repaired.timelineTracks), true);
  assert.equal(Array.isArray(repaired.timelineEvents), true);
  assert.equal(Array.isArray(repaired.timelineMarkers), true);
  assert.ok(repaired.timelineData);
});

test('47 scene validator accepts universal timeline object', () => {
  const scene = normalizeScene({
    timeline: {
      timelineId: 'tl-1',
      tracks: [{ id: 't1', name: 'A', purpose: 'x', enabled: true, events: [], clips: [], markers: [], dependencies: [], metadata: {} }]
    }
  });

  const validation = validateScene(scene);
  assert.notEqual(validation.status, 'invalid');
});

test('48 scene pipeline stores timelineData and aliases', () => {
  const scene = processSceneJsonPipeline({
    title: 'Timeline Scene',
    timelineTracks: [{ id: 't1', name: 'A', purpose: 'x', enabled: true, events: [], clips: [], markers: [], dependencies: [], metadata: {} }]
  });

  assert.ok(scene.timelineData);
  assert.equal(Array.isArray(scene.timelineTracks), true);
});

test('49 runtime graph metadata stores timeline ids only', () => {
  const scene = processSceneJsonPipeline({
    title: 'Runtime Meta Scene',
    timelineTracks: [{ id: 't1', name: 'A', purpose: 'x', enabled: true, events: [], clips: [{ id: 'c1', start: 0, end: 1, duration: 1, objects: [] }], markers: [{ id: 'm1', type: 'chapter', time: 0 }], dependencies: [], metadata: {} }],
    timelineEvents: [{ id: 'e1', type: 'custom', time: 0, targets: ['c1'] }]
  });

  const runtime = buildRuntimeSceneGraph(scene);
  assert.ok(runtime.metadata.timeline);
  assert.equal(Array.isArray(runtime.metadata.timeline.trackIds), true);
  assert.equal(Array.isArray(runtime.metadata.timeline.clipIds), true);
  assert.equal(Array.isArray(runtime.metadata.timeline.markerIds), true);
  assert.equal(Array.isArray(runtime.metadata.timeline.eventIds), true);
});

test('50 timeline integrity detects dependency cycles', () => {
  const integrity = runTimelineIntegrityChecks(baseTimeline({
    dependencies: [
      { id: 'd1', type: 'before', from: 'clip-1', to: 'event-1' },
      { id: 'd2', type: 'before', from: 'event-1', to: 'clip-1' }
    ]
  }));

  assert.ok(integrity.warnings.some((entry) => entry.includes('cycle')));
});
