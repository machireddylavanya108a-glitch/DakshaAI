import test from 'node:test';
import assert from 'node:assert/strict';
import {
  UniversalAdaptiveRenderingPerformanceRuntime,
  migrateAdaptiveRuntimeState
} from './UniversalAdaptiveRenderingPerformanceRuntime.js';

function createMemoryAdapter() {
  const store = new Map();
  return {
    setItem(key, value) {
      store.set(String(key), String(value));
    },
    getItem(key) {
      return store.get(String(key)) || null;
    },
    removeItem(key) {
      store.delete(String(key));
    }
  };
}

function createRuntimeFixture(adapter = createMemoryAdapter()) {
  const rendererCommands = [];
  const rendererCore = {
    update(input = {}) {
      rendererCommands.push(input);
      return {
        status: 'updated'
      };
    },
    on(_channel, _listener) {
      return () => {};
    }
  };

  const timelineScheduler = {
    on(_channel, _listener) {
      return () => {};
    }
  };

  return {
    runtime: {
      sceneId: 'scene-adaptive-runtime-test',
      rendererCore,
      timelineScheduler,
      assetLoadingRuntime: {
        snapshot() {
          return {
            metrics: {
              loadedCount: 8,
              requestedCount: 10,
              failedCount: 1
            },
            supportsProceduralFallback: true,
            unresolvedAssets: [{ assetId: 'asset-missing-1' }]
          };
        }
      },
      metadata: {
        rendererAdapter: {},
        interactionEngine: {},
        aiTeacherAdapter: {},
        rendererCapabilities: {
          modes: ['Full Interactive 3D', 'Interactive 2D', 'Text-assisted Learning', 'Holographic Mode']
        }
      },
      graph: {
        nodes: new Map(Array.from({ length: 12 }, (_, index) => [`n-${index + 1}`, {}])),
        edges: Array.from({ length: 20 }, (_, index) => ({ from: 'n-1', to: `n-${(index % 10) + 2}`, relation: 'links' })),
        getNodeCount() {
          return 12;
        },
        getRelationshipCount() {
          return 20;
        }
      }
    },
    rendererCommands,
    adapter
  };
}

test('adaptive quality and fps scaling respond to performance telemetry', () => {
  const { runtime } = createRuntimeFixture();
  const adaptiveRuntime = new UniversalAdaptiveRenderingPerformanceRuntime(runtime);

  const built = adaptiveRuntime.build({
    deviceCapabilities: {
      gpuTier: 4,
      cpuTier: 4,
      memoryGb: 16,
      batteryLevel: 0.9,
      thermalState: 'nominal',
      networkQuality: 'stable',
      webglContextStable: true
    },
    performance: {
      fps: {
        current: 60,
        average: 58,
        minimum: 50,
        samples: [58, 60, 57]
      },
      frameBudgetMs: 16.67,
      frameTimeMs: 15.5,
      gpuLoad: 0.42,
      cpuLoad: 0.38,
      memoryMb: {
        used: 740,
        budget: 2048,
        pressure: 0.36
      }
    }
  });

  assert.equal(built.status, 'built');

  const before = adaptiveRuntime.snapshot().performance.adaptiveQualityScale;
  adaptiveRuntime.recordFrameSample({ fps: 24, frameTimeMs: 42 });
  const after = adaptiveRuntime.snapshot().performance.adaptiveQualityScale;

  assert.equal(after <= before, true);
  assert.equal(adaptiveRuntime.snapshot().performance.fps.current > 0, true);
});

test('memory optimization and dynamic lod adapt under pressure', () => {
  const { runtime } = createRuntimeFixture();
  const adaptiveRuntime = new UniversalAdaptiveRenderingPerformanceRuntime(runtime);

  adaptiveRuntime.build({
    deviceCapabilities: {
      gpuTier: 2,
      cpuTier: 2,
      memoryGb: 4,
      batteryLevel: 0.4,
      thermalState: 'hot',
      networkQuality: 'poor'
    },
    performance: {
      fps: {
        current: 30,
        average: 28,
        minimum: 20,
        samples: [20, 28, 30]
      },
      frameBudgetMs: 20,
      frameTimeMs: 33,
      memoryMb: {
        used: 1400,
        budget: 1536,
        pressure: 0.9
      },
      gpuLoad: 0.88,
      cpuLoad: 0.82
    }
  });

  const snapshot = adaptiveRuntime.snapshot();
  assert.equal(snapshot.performance.dynamicLodBias >= 1, true);
  assert.equal(snapshot.performance.adaptiveQualityScale <= 1, true);
});

test('adaptive renderer switches mode including 3D to 2D fallback', () => {
  const { runtime, rendererCommands } = createRuntimeFixture();
  const adaptiveRuntime = new UniversalAdaptiveRenderingPerformanceRuntime(runtime);

  adaptiveRuntime.build({
    deviceCapabilities: {
      gpuTier: 4,
      cpuTier: 4,
      memoryGb: 16,
      batteryLevel: 1,
      thermalState: 'nominal',
      networkQuality: 'stable'
    }
  });

  const initialMode = adaptiveRuntime.snapshot().adaptiveRenderer.currentMode;

  adaptiveRuntime.update({
    performance: {
      fps: {
        current: 14,
        average: 16,
        minimum: 9,
        samples: [10, 16, 14]
      },
      frameBudgetMs: 25,
      frameTimeMs: 65,
      memoryMb: {
        used: 1500,
        budget: 1536,
        pressure: 0.95
      },
      gpuLoad: 0.96,
      cpuLoad: 0.92,
      batteryAwareness: {
        enabled: true,
        level: 0.2,
        charging: false
      },
      thermalAwareness: {
        state: 'critical',
        penalty: 0.5
      },
      networkAwareness: {
        quality: 'poor',
        latencyMs: 240,
        throughputMbps: 1.2
      }
    },
    userPreferences: {
      prefersBatterySaving: true,
      prefersMotionReduction: true,
      prefersTextAssistance: true
    }
  });

  const fallbackMode = adaptiveRuntime.snapshot().adaptiveRenderer.currentMode;
  assert.equal(initialMode !== fallbackMode, true);
  assert.equal(
    fallbackMode === 'Interactive 2D' || fallbackMode === 'Static Visualization' || fallbackMode === 'Diagram Mode' || fallbackMode === 'Text-assisted Learning' || fallbackMode === 'Timeline Mode' || fallbackMode === 'Concept Graph Mode',
    true
  );
  assert.equal(rendererCommands.some((entry) => (entry.commands || []).some((cmd) => cmd.action === 'adaptive-render-mode-switch')), true);
});

test('accessibility modes influence adaptive rendering choices', () => {
  const { runtime } = createRuntimeFixture();
  const adaptiveRuntime = new UniversalAdaptiveRenderingPerformanceRuntime(runtime);

  adaptiveRuntime.build({
    deviceCapabilities: {
      gpuTier: 3,
      cpuTier: 3,
      memoryGb: 8,
      batteryLevel: 0.6,
      thermalState: 'nominal',
      networkQuality: 'stable'
    }
  });

  adaptiveRuntime.setAccessibilityMode({
    reducedMotion: true,
    highContrast: true,
    screenReaderMetadata: true,
    scalableUi: true,
    keyboardNavigation: true,
    captionsMetadata: true,
    narrationMetadata: true,
    interactionTimingMs: 600,
    fontScaling: 1.6
  });

  const snapshot = adaptiveRuntime.snapshot();
  assert.equal(snapshot.accessibility.reducedMotion, true);
  assert.equal(snapshot.accessibility.highContrast, true);
  assert.equal(snapshot.accessibility.fontScaling >= 1.5, true);
});

test('webgl and runtime recovery flows update recovery diagnostics', () => {
  const { runtime } = createRuntimeFixture();
  const adaptiveRuntime = new UniversalAdaptiveRenderingPerformanceRuntime(runtime);

  adaptiveRuntime.build();
  adaptiveRuntime.handleWebGLContextLoss('context-lost');
  adaptiveRuntime.performRuntimeRecovery('runtime-recovery', {
    automaticQualityDowngrade: true,
    continueSession: true
  });

  const snapshot = adaptiveRuntime.snapshot();
  assert.equal(snapshot.recovery.webglRecoveries >= 1, true);
  assert.equal(snapshot.recovery.runtimeRecoveries >= 1, true);
  assert.equal(snapshot.recovery.qualityDowngrades >= 1, true);
});

test('unknown renderer types and unknown capability metrics are preserved', () => {
  const { runtime } = createRuntimeFixture();
  const adaptiveRuntime = new UniversalAdaptiveRenderingPerformanceRuntime(runtime);

  adaptiveRuntime.build({
    deviceCapabilities: {
      rendererTypes: ['Future Neural Renderer'],
      unknownCapabilities: ['quantum-gpu-channel']
    }
  });

  adaptiveRuntime.update({
    unknownMetrics: ['adaptive-bandwidth-jitter'],
    unknownAccessibilitySettings: ['future-neural-focus-mode']
  });

  const snapshot = adaptiveRuntime.snapshot();
  assert.equal(snapshot.adaptiveRenderer.candidateModes.includes('Future Neural Renderer'), true);
  assert.equal(snapshot.performance.unknownMetrics.includes('adaptive-bandwidth-jitter'), true);
  assert.equal(snapshot.accessibility.unknownSettings.includes('future-neural-focus-mode'), true);
});

test('session persistence recovery and backward compatibility migration work', () => {
  const adapter = createMemoryAdapter();
  const first = createRuntimeFixture(adapter);
  const firstRuntime = new UniversalAdaptiveRenderingPerformanceRuntime(first.runtime, {
    persistenceAdapter: adapter,
    persistenceKey: 'daksha.adaptive.runtime.recover-test'
  });

  firstRuntime.build();
  firstRuntime.markInterrupted('network-drop');
  firstRuntime.persistSession();

  const second = createRuntimeFixture(adapter);
  const secondRuntime = new UniversalAdaptiveRenderingPerformanceRuntime(second.runtime, {
    persistenceAdapter: adapter,
    persistenceKey: 'daksha.adaptive.runtime.recover-test'
  });

  const recovered = secondRuntime.recoverSession();
  assert.equal(recovered, true);
  assert.equal(secondRuntime.snapshot().session.recovered, true);

  const migrated = migrateAdaptiveRuntimeState({
    performanceManager: {
      fps: {
        average: 32
      }
    },
    accessibilityManager: {
      reducedMotion: true,
      fontScaling: 1.4
    },
    recoveryManager: {
      runtimeRecoveries: 2
    },
    diagnostics: {
      warnings: ['legacy-adaptive-state']
    }
  });

  assert.equal(migrated.schemaVersion, 'v1');
  assert.equal(migrated.performance.fps.average, 32);
  assert.equal(migrated.accessibility.reducedMotion, true);
  assert.equal(migrated.recovery.runtimeRecoveries, 2);
  assert.equal(migrated.diagnostics.warnings.includes('legacy-adaptive-state'), true);
});
