import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createUniversalPerformanceSecurityReliabilityTestingFramework,
  runUniversalPerformanceSecurityReliabilityTestingFramework,
  migrateFrameworkReport,
  serializeFrameworkReport,
  deserializeFrameworkReport
} from './index.js';

test('performance report includes required metrics and non-negative timings', async () => {
  const result = await runUniversalPerformanceSecurityReliabilityTestingFramework({
    sourceType: 'pdf',
    topic: 'Distributed systems',
    text: 'Distributed systems consistency availability partition tolerance replication.'
  });

  assert.equal(result.validation.valid, true);
  assert.equal(result.report.performanceReport.startupTimeMs >= 0, true);
  assert.equal(result.report.performanceReport.sceneGenerationTimeMs >= 0, true);
  assert.equal(result.report.performanceReport.runtimeGraphCreationMs >= 0, true);
  assert.equal(result.report.performanceReport.timelineLatencyMs >= 0, true);
  assert.equal(result.report.performanceReport.interactionLatencyMs >= 0, true);
  assert.equal(result.report.performanceReport.assetLoadingMs >= 0, true);
});

test('security report validates malformed input and injection protection paths', async () => {
  const result = await runUniversalPerformanceSecurityReliabilityTestingFramework({
    sourceType: 'website',
    topic: 'Security topic',
    text: '<script>alert(1)</script> javascript:evil eval(alert(1)) safe lesson content'
  });

  assert.equal(result.validation.valid, true);
  assert.equal(result.report.securityReport.inputValidation, true);
  assert.equal(result.report.securityReport.jsonValidation, true);
  assert.equal(result.report.securityReport.serializationSafety, true);
  assert.equal(result.report.securityReport.deserializationSafety, true);
  assert.equal(typeof result.report.securityReport.runtimeIntegrity, 'boolean');
});

test('reliability report includes crash recovery session recovery and migration coverage', async () => {
  const result = await runUniversalPerformanceSecurityReliabilityTestingFramework({
    sourceType: 'docx',
    topic: 'Recovery lesson',
    text: 'Recovery pathways across runtime modules and checkpoints.'
  });

  assert.equal(result.validation.valid, true);
  assert.equal(result.report.reliabilityReport.crashRecovery, true);
  assert.equal(result.report.reliabilityReport.sessionRecovery, true);
  assert.equal(result.report.reliabilityReport.rendererRecovery, true);
  assert.equal(result.report.reliabilityReport.timelineRecovery, true);
  assert.equal(result.report.reliabilityReport.runtimeGraphRecovery, true);
  assert.equal(result.report.reliabilityReport.versionMigration, true);
});

test('stress report validates large lessons huge graphs and unknown future lesson types', async () => {
  const result = await runUniversalPerformanceSecurityReliabilityTestingFramework({
    sourceType: 'audio',
    topic: 'Stress scenario',
    text: 'This lesson validates scale and stress handling.'
  });

  assert.equal(result.validation.valid, true);
  assert.equal(result.report.stressReport.veryLargeLessons.passed, true);
  assert.equal(result.report.stressReport.hugeSceneGraphs.passed, true);
  assert.equal(result.report.stressReport.thousandsOfObjects.passed, true);
  assert.equal(result.report.stressReport.deepTimelines.passed, true);
  assert.equal(result.report.stressReport.simultaneousInteractions.passed, true);
  assert.equal(result.report.stressReport.unknownFutureLessonTypes.passed, true);
});

test('unknown future content types and auto module discovery participate without code changes', async () => {
  const result = await runUniversalPerformanceSecurityReliabilityTestingFramework({
    sourceType: 'neural-holo-stream-v9',
    topic: 'Future mode',
    text: 'Future type should still run all system validations.'
  });

  assert.equal(result.validation.valid, true);
  assert.equal(result.report.diagnostics.unknownFutureTypeParticipation, true);
  assert.equal(result.report.moduleCoverage.moduleCount > 0, true);
  assert.equal(Array.isArray(result.report.moduleCoverage.entries), true);
});

test('cache validation and memory usage metadata are reported', async () => {
  const result = await runUniversalPerformanceSecurityReliabilityTestingFramework({
    sourceType: 'youtube',
    topic: 'Cache lesson',
    text: 'Cache metadata and memory usage should be visible in diagnostics.'
  });

  assert.equal(result.validation.valid, true);
  assert.equal(typeof result.report.performanceReport.cacheEfficiency, 'number');
  assert.equal(typeof result.report.performanceReport.memoryUsage.heapUsedDeltaBytes, 'number');
  assert.equal(typeof result.report.performanceReport.cpuUsage.userDeltaMicros, 'number');
  assert.equal(result.report.diagnostics.cache.hasCacheAfter, true);
});

test('framework persistence recovery and regression comparison work across runs', async () => {
  const framework = createUniversalPerformanceSecurityReliabilityTestingFramework({
    persistenceKey: 'daksha.system.testing.framework.test'
  });

  const first = await framework.run({
    sourceType: 'source-code',
    topic: 'First run',
    text: 'Compiler stages lexical parsing semantic analysis optimization.'
  });

  const second = await framework.run({
    sourceType: 'source-code',
    topic: 'Second run',
    text: 'Compiler stages with additional runtime and pipeline diagnostics.',
    steps: [
      { id: 's1', title: 'Intro', order: 0, duration: 3 },
      { id: 's2', title: 'Flow', order: 1, duration: 3 },
      { id: 's3', title: 'Review', order: 2, duration: 3 }
    ]
  });

  assert.equal(first.validation.valid, true);
  assert.equal(second.validation.valid, true);
  assert.equal(Array.isArray(second.report.regressionReport.deltas), true);
  assert.equal(second.snapshot.summary.runCount >= 2, true);

  const recovered = createUniversalPerformanceSecurityReliabilityTestingFramework({
    persistenceKey: 'daksha.system.testing.framework.test'
  });
  assert.equal(recovered.snapshot().summary.runCount >= 2, true);
});

test('serialization deserialization and legacy migration remain backward compatible', async () => {
  const result = await runUniversalPerformanceSecurityReliabilityTestingFramework({
    sourceType: 'research-paper',
    topic: 'Legacy migration test',
    text: 'Research reliability and migration compatibility checks.'
  });

  const serialized = serializeFrameworkReport(result.report);
  const restored = deserializeFrameworkReport(serialized);

  assert.equal(restored.validation.valid, true);
  assert.equal(restored.report.schemaVersion, 'v1');

  const migrated = migrateFrameworkReport({
    framework: 'legacy-system-framework',
    sourceType: 'legacy-source',
    performance: { score: 0.4 },
    security: { score: 0.5 },
    reliability: { score: 0.6 },
    stress: { score: 0.7 },
    suggestions: ['legacy optimization']
  });

  assert.equal(migrated.schemaVersion, 'v1');
  assert.equal(migrated.framework.length > 0, true);
  assert.equal(Array.isArray(migrated.optimizationSuggestions), true);
});
