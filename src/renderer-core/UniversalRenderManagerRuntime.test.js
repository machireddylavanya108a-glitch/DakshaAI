import test from 'node:test';
import assert from 'node:assert/strict';
import {
  UniversalRenderManagerRuntime,
  deriveAdaptiveQualityProfile,
  migrateRuntimeState
} from './UniversalRenderManagerRuntime.js';

function createRenderBundleFixture() {
  return {
    schemaVersion: 'v1',
    runtimeGraphSummary: {
      nodeCount: 18,
      edgeCount: 22
    },
    rendererObjects: [
      {
        renderId: 'render-camera-1',
        nodeId: 'camera-1',
        adapterType: 'camera',
        sourceKey: 'cameras',
        kind: 'CameraNode',
        payload: {
          metadata: { sourceKey: 'cameras' },
          properties: { mode: 'orbit', fov: 60, position: [0, 2, 6], target: [0, 1, 0] },
          runtimeData: { cameraControl: { mode: 'cinematic-camera' } }
        }
      },
      {
        renderId: 'render-camera-unknown',
        nodeId: 'camera-future',
        adapterType: 'camera',
        sourceKey: 'cameraFutureFamily',
        kind: 'QuantumCameraType',
        payload: {
          metadata: { sourceKey: 'cameraFutureFamily' },
          properties: { mode: 'quantum-follow' },
          runtimeData: {}
        }
      },
      {
        renderId: 'render-light-1',
        nodeId: 'light-1',
        adapterType: 'light',
        sourceKey: 'lights',
        kind: 'LightNode',
        payload: {
          metadata: { sourceKey: 'lights' },
          properties: { type: 'directional', intensity: 1.2, color: '#ffffff' },
          runtimeData: {}
        }
      },
      {
        renderId: 'render-light-unknown',
        nodeId: 'light-future',
        adapterType: 'light',
        sourceKey: 'futureLights',
        kind: 'BioPhotonLight',
        payload: {
          metadata: { sourceKey: 'futureLights' },
          properties: { type: 'bio-photon', intensity: 0.9 },
          runtimeData: {}
        }
      },
      {
        renderId: 'render-environment-1',
        nodeId: 'environment-1',
        adapterType: 'environment',
        sourceKey: 'environments',
        kind: 'EnvironmentNode',
        payload: {
          metadata: { sourceKey: 'environments' },
          properties: {
            type: 'laboratory',
            background: { type: 'sky' },
            sky: { type: 'procedural' },
            hdr: { id: 'lab-hdr' }
          },
          runtimeData: {}
        }
      },
      {
        renderId: 'render-environment-unknown',
        nodeId: 'environment-future',
        adapterType: 'environment',
        sourceKey: 'futureEnv',
        kind: 'NeuralRealmEnvironment',
        payload: {
          metadata: { sourceKey: 'futureEnv' },
          properties: { type: 'neural-realm' },
          runtimeData: {}
        }
      },
      {
        renderId: 'render-obj-1',
        nodeId: 'obj-1',
        adapterType: 'educational-object',
        sourceKey: 'educationalObjects',
        kind: 'ObjectNode',
        payload: {
          metadata: { sourceKey: 'educationalObjects' },
          properties: { visible: true, lodLevel: 1 },
          runtimeData: {}
        }
      },
      {
        renderId: 'render-label-1',
        nodeId: 'label-1',
        adapterType: 'label',
        sourceKey: 'labels',
        kind: 'LabelNode',
        payload: {
          metadata: { sourceKey: 'labels' },
          properties: { visible: true },
          runtimeData: {}
        }
      },
      {
        renderId: 'render-overlay-1',
        nodeId: 'overlay-1',
        adapterType: 'overlay',
        sourceKey: 'overlays',
        kind: 'OverlayNode',
        payload: {
          metadata: { sourceKey: 'overlays' },
          properties: { visible: true },
          runtimeData: {}
        }
      },
      {
        renderId: 'render-hotspot-1',
        nodeId: 'hotspot-1',
        adapterType: 'hotspot',
        sourceKey: 'hotspots',
        kind: 'HotspotNode',
        payload: {
          metadata: { sourceKey: 'hotspots' },
          properties: { visible: true },
          runtimeData: {}
        }
      },
      {
        renderId: 'render-gizmo-1',
        nodeId: 'gizmo-1',
        adapterType: 'generic-node',
        sourceKey: 'gizmos',
        kind: 'GizmoNode',
        payload: {
          metadata: { sourceKey: 'gizmos' },
          properties: { visible: true },
          runtimeData: {}
        }
      },
      {
        renderId: 'render-object-unknown',
        nodeId: 'object-future',
        adapterType: 'generic-node',
        sourceKey: 'futureObjectType',
        kind: 'HyperObjectNode',
        payload: {
          metadata: { sourceKey: 'futureObjectType' },
          properties: { visible: true },
          runtimeData: {}
        }
      }
    ]
  };
}

function createContextFixture() {
  return {
    renderBundle: createRenderBundleFixture(),
    runtimeMetadata: {
      visualizationStrategy: {
        summary: {
          confidenceScore: 0.72
        }
      },
      rendererAdapter: {
        qualityScore: 0.7
      }
    },
    deviceCapabilities: {
      gpuTier: 4,
      cpuTier: 3,
      memoryGb: 16,
      pixelRatio: 1.25,
      targetFps: 90,
      thermalState: 'nominal'
    }
  };
}

test('camera creation covers known and unknown camera types', () => {
  const runtime = new UniversalRenderManagerRuntime();
  const result = runtime.build(createContextFixture());

  assert.equal(result.status, 'built');

  const snapshot = runtime.snapshot();
  assert.equal(snapshot.camera.entities.length >= 2, true);
  assert.equal(snapshot.camera.entities.some((entry) => entry.mode === 'cinematic-camera'), true);
  assert.equal(snapshot.camera.entities.some((entry) => entry.mode === 'quantum-follow'), true);
});

test('lighting creation covers known and unknown lighting types', () => {
  const runtime = new UniversalRenderManagerRuntime();
  runtime.build(createContextFixture());

  const snapshot = runtime.snapshot();
  assert.equal(snapshot.lighting.entities.length >= 2, true);
  assert.equal(snapshot.lighting.entities.some((entry) => entry.type === 'directional'), true);
  assert.equal(snapshot.lighting.entities.some((entry) => entry.type === 'bio-photon'), true);
});

test('environment selection supports known and unknown environments', () => {
  const runtime = new UniversalRenderManagerRuntime();
  runtime.build(createContextFixture());

  const snapshot = runtime.snapshot();
  assert.equal(snapshot.environment.entities.length >= 2, true);
  assert.equal(snapshot.environment.entities.some((entry) => entry.type === 'laboratory'), true);
  assert.equal(snapshot.environment.entities.some((entry) => entry.type === 'neural-realm'), true);
});

test('object rendering metadata includes required and future object families', () => {
  const runtime = new UniversalRenderManagerRuntime();
  runtime.build(createContextFixture());

  const snapshot = runtime.snapshot();
  assert.equal(snapshot.objects.entities.some((entry) => entry.family === 'educational-objects'), true);
  assert.equal(snapshot.objects.entities.some((entry) => entry.family === 'labels'), true);
  assert.equal(snapshot.objects.entities.some((entry) => entry.family === 'overlays'), true);
  assert.equal(snapshot.objects.entities.some((entry) => entry.family === 'hotspots'), true);
  assert.equal(snapshot.objects.entities.some((entry) => entry.family === 'gizmos'), true);
  assert.equal(snapshot.objects.entities.some((entry) => entry.family === 'future-object-types'), true);
});

test('adaptive quality derives profile and supports runtime updates', () => {
  const runtime = new UniversalRenderManagerRuntime();
  runtime.build(createContextFixture());

  const baseline = runtime.snapshot();
  assert.equal(['low', 'balanced', 'high', 'ultra'].includes(baseline.qualityProfile.profile), true);

  const updated = runtime.update({
    ...createContextFixture(),
    deviceCapabilities: {
      gpuTier: 1,
      cpuTier: 1,
      memoryGb: 4,
      targetFps: 30,
      thermalState: 'hot'
    },
    commands: [
      {
        action: 'camera-switch',
        payload: {
          cameraId: 'render-camera-unknown',
          cameraMode: 'quantum-follow'
        }
      },
      {
        action: 'object-visibility',
        nodeId: 'obj-1',
        payload: {
          visible: false
        }
      }
    ]
  });

  assert.equal(updated.status, 'updated');
  const snapshot = runtime.snapshot();
  assert.equal(snapshot.camera.activeId, 'render-camera-unknown');
  assert.equal(snapshot.objects.entities.find((entry) => entry.nodeId === 'obj-1')?.visible, false);
});

test('quality helper and migration maintain backward compatibility', () => {
  const profile = deriveAdaptiveQualityProfile(createContextFixture());
  assert.equal(profile.schemaVersion, 'v1');
  assert.equal(profile.qualityScore >= 0 && profile.qualityScore <= 1, true);

  const migrated = migrateRuntimeState({
    adaptiveQuality: {
      qualityScore: 0.4,
      profile: 'legacy-medium'
    },
    objectRender: {
      entities: [{ renderId: 'legacy-1', family: 'future-object-types' }]
    },
    diagnostics: {
      warnings: ['legacy-render-manager-state']
    }
  });

  assert.equal(migrated.schemaVersion, 'v1');
  assert.equal(migrated.diagnostics.warnings.includes('legacy-render-manager-state'), true);
  assert.equal(migrated.diagnostics.warnings.some((entry) => entry.includes('migrated from legacy format')), true);
  assert.equal(Array.isArray(migrated.objects.entities), true);
});
