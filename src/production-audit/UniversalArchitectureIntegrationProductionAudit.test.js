import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { destroyScene, getActiveRuntimeScene } from '../scene-builder/SceneRuntime.js';
import {
  runUniversalArchitectureIntegrationProductionAudit,
  migrateIntegrationAuditReport,
  serializeIntegrationAuditReport,
  deserializeIntegrationAuditReport
} from './index.js';

const HARD_TIMEOUT_MS = 10000;
let lastProgressStep = 'not-started';
let focusedDurationMs = 0;

function activeHandleTypes() {
  return process._getActiveHandles().map((handle) => handle?.constructor?.name || 'UnknownHandle');
}

function activeRequestTypes() {
  return process._getActiveRequests().map((request) => request?.constructor?.name || 'UnknownRequest');
}

function progressLogger(event) {
  const message = `[AUDIT_PROGRESS] ${event.message}`;
  console.log(message, event.details || {});
  lastProgressStep = `${event.step}:${event.phase}:${event.label}`;
}

async function runAuditWithHardTimeout(input = {}, options = {}) {
  let timeoutId;

  const runPromise = runUniversalArchitectureIntegrationProductionAudit(input, {
    ...options,
    fastMode: true,
    srcRoot: options.srcRoot || 'src',
    maxDiscoveryDepth: 16,
    maxDiscoveryFiles: 6000,
    maxGraphDepth: 32,
    maxGraphNodes: 6000,
    progressLogger
  });

  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      console.error('[AUDIT_TIMEOUT] step:', lastProgressStep);
      console.error('[AUDIT_TIMEOUT] activeHandles:', activeHandleTypes());
      console.error('[AUDIT_TIMEOUT] activeRequests:', activeRequestTypes());
      reject(new Error(`Production audit exceeded ${HARD_TIMEOUT_MS}ms`));
    }, HARD_TIMEOUT_MS);
    timeoutId.unref?.();
  });

  try {
    return await Promise.race([runPromise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId);
  }
}

afterEach(() => {
  console.log('[AUDIT_PROGRESS] STEP 9 BEFORE afterEach cleanup', {
    activeHandles: activeHandleTypes(),
    activeRequests: activeRequestTypes()
  });

  const activeRuntime = getActiveRuntimeScene();
  if (activeRuntime?.timelineScheduler?.stop) {
    activeRuntime.timelineScheduler.stop('test-afterEach-cleanup');
  }
  if (activeRuntime?.timelineScheduler?.listeners instanceof Map) {
    activeRuntime.timelineScheduler.listeners.clear();
  }

  try {
    destroyScene();
  } catch {
    // Ignore cleanup failures in teardown.
  }

  console.log('[AUDIT_PROGRESS] STEP 9 AFTER afterEach cleanup', {
    activeHandles: activeHandleTypes(),
    activeRequests: activeRequestTypes()
  });
});

test('complete runtime pipeline executes every universal stage in order', async () => {
  const startedAt = performance.now();
  const result = await runAuditWithHardTimeout({
    sourceType: 'future-neural-stream-v7',
    sourceName: 'systems.pdf',
    topic: 'Distributed Systems',
    text: 'Distributed systems cover consistency, replication, quorum, partitions, and fault tolerance.'
  });
  focusedDurationMs = performance.now() - startedAt;
  console.log('[FOCUSED_TEST_DURATION_MS]', focusedDurationMs.toFixed(2));

  console.log('[AUDIT_PROGRESS] STEP 8 BEFORE final assertion', {
    lastProgressStep,
    durationMs: focusedDurationMs
  });
  assert.equal(result.validation.valid, true);
  assert.equal(Array.isArray(result.report.pipelineStages), true);
  assert.equal(result.report.pipelineStages.length, 16);
  assert.equal(result.report.pipelineStages.every((stage) => ['pass', 'warn'].includes(stage.status)), true);
  assert.equal(result.validation.valid, true);
  assert.equal(result.report.lifecycleVerification.startup.status, 'pass');
  assert.equal(result.report.lifecycleVerification.shutdown.status, 'pass');
  assert.equal(['pass', 'warn'].includes(result.report.lifecycleVerification.recovery.status), true);
  assert.equal(result.report.dependencyVerification.entries.length > 0, true);
  assert.equal(result.report.dependencyVerification.requiredCoverage.every((entry) => entry.covered), true);
  assert.equal(result.report.contractVerification.status, 'pass');
  assert.equal(result.report.configurationVerification.status, 'pass');
  assert.equal(result.report.versionCompatibilityVerification.status, 'pass');
  assert.equal(typeof result.report.productionHealthReport.productionReadinessScore, 'number');
  assert.equal(result.report.runtimeCapabilityReport.timelineTrackCount >= 0, true);
  assert.equal(typeof result.report.finalArchitectureAuditReport.status, 'string');
  assert.equal(result.snapshot.summary.unknownFutureTypeRuns >= 1, true);

  const serialized = serializeIntegrationAuditReport(result.report);
  const restored = deserializeIntegrationAuditReport(serialized);
  assert.equal(restored.validation.valid, true);
  assert.equal(restored.report.schemaVersion, 'v1');

  const migrated = migrateIntegrationAuditReport({
    framework: 'legacy-integration-audit',
    sourceType: 'legacy-type',
    stages: [{ stage: 'Legacy', status: 'pass' }],
    productionReadinessScore: 0.5
  });
  assert.equal(migrated.schemaVersion, 'v1');
  assert.equal(Array.isArray(migrated.pipelineStages), true);

  console.log('[AUDIT_PROGRESS] STEP 8 AFTER final assertion', {
    focusedDurationMs,
    score: result.report.productionHealthReport.productionReadinessScore
  });
});
