import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createUniversalCrossTopicLearningQualityTestingFramework,
  runUniversalCrossTopicLearningQualityTestingFramework,
  serializeLearningQualityReport,
  deserializeLearningQualityReport,
  migrateLearningQualityReport
} from './index.js';

test('unknown lesson types automatically participate without code changes', () => {
  const result = runUniversalCrossTopicLearningQualityTestingFramework({
    sourceType: 'quantum-hologram-stream',
    topic: 'Adaptive signal processing',
    text: 'Adaptive signal processing for learning systems with checkpoints and simulations.'
  });

  assert.equal(result.validation.valid, true);
  assert.equal(result.report.diagnostics.unknownFutureTypeParticipation, true);
  assert.equal(typeof result.report.metrics.overallQualityScore, 'number');
  assert.equal(result.report.integration.rendererCore.activeObjectCount >= 0, true);
});

test('multimodal lessons generate complete quality report and validations', () => {
  const result = runUniversalCrossTopicLearningQualityTestingFramework({
    sourceType: 'video',
    sourceName: 'lesson-video.mp4',
    topic: 'Distributed systems',
    text: 'Distributed systems include consistency, availability, partition tolerance, and replication tradeoffs.',
    visualDescription: 'Diagram of nodes and edges across regions.',
    transcript: 'Node A replicates to Node B then reconciles state.',
    goals: ['Understand consistency models', 'Analyze trade-offs'],
    steps: [
      { id: 's1', title: 'Consistency', order: 0, duration: 4 },
      { id: 's2', title: 'Availability', order: 1, duration: 4 },
      { id: 's3', title: 'Partition tolerance', order: 2, duration: 4 }
    ]
  });

  assert.equal(result.validation.valid, true);
  assert.equal(result.report.validations.timelineQuality.status, 'pass');
  assert.equal(result.report.validations.runtimeGraphConsistency.status, 'pass');
  assert.equal(Array.isArray(result.report.recommendations), true);
});

test('mixed-language lessons are supported with stable metrics', () => {
  const result = runUniversalCrossTopicLearningQualityTestingFramework({
    sourceType: 'pdf',
    topic: 'Linear algebra',
    text: 'Linear algebra includes vectors and matrices. रैखिक बीजगणित में सदिश और आव्यूह शामिल हैं।',
    language: 'Mixed'
  });

  assert.equal(result.validation.valid, true);
  assert.equal(result.report.metrics.lessonCompleteness > 0, true);
  assert.equal(result.report.metrics.confidenceScores > 0, true);
});

test('future content types preserve adaptive fallback quality and confidence metadata', () => {
  const result = runUniversalCrossTopicLearningQualityTestingFramework({
    sourceType: 'neural-sensory-capture-v9',
    topic: 'Control theory',
    text: 'Control loops stabilize systems using feedback, gain, and damping.'
  });

  assert.equal(result.validation.valid, true);
  assert.equal(result.report.metrics.fallbackQuality >= 0.35, true);
  assert.equal(result.report.validations.templateRecommendationQuality.status, 'pass');
});

test('corrupted lessons recover safely through normalization and still produce report', () => {
  const result = runUniversalCrossTopicLearningQualityTestingFramework({
    sourceType: 'docx',
    topic: null,
    text: '',
    steps: [
      { id: null, title: '', order: 'bad', duration: -5, objects: 'invalid-array' }
    ],
    objects: [
      { id: null, name: null },
      null
    ],
    interactions: [
      { id: null, interactionType: '', targetObjectId: null }
    ]
  });

  assert.equal(result.validation.valid, true);
  assert.equal(result.report.diagnostics.warningCount >= 1, true);
  assert.equal(result.report.metrics.overallQualityScore > 0, true);
});

test('incomplete lessons trigger recommendations and checkpoint diagnostics', () => {
  const result = runUniversalCrossTopicLearningQualityTestingFramework({
    sourceType: 'website',
    topic: 'Sparse topic',
    text: 'brief',
    concepts: [],
    goals: [],
    steps: [],
    checkpoints: []
  });

  assert.equal(result.validation.valid, true);
  assert.equal(result.report.metrics.checkpointCoverage > 0, true);
  assert.equal(result.report.recommendations.length >= 1, true);
});

test('framework supports serialization, migration, and backward compatibility', () => {
  const result = runUniversalCrossTopicLearningQualityTestingFramework({
    sourceType: 'source-code',
    topic: 'Compiler pipelines',
    text: 'Lexing parsing semantic analysis optimization code generation.'
  });

  const serialized = serializeLearningQualityReport(result.report);
  const restored = deserializeLearningQualityReport(serialized);

  assert.equal(restored.validation.valid, true);
  assert.equal(restored.report.schemaVersion, 'v1');

  const migrated = migrateLearningQualityReport({
    framework: 'legacy-quality-framework',
    sourceType: 'legacy-type',
    measurement: {
      lessonCompleteness: 0.5
    },
    improvementScore: 0.2,
    recommendations: ['legacy recommendation']
  });

  assert.equal(migrated.schemaVersion, 'v1');
  assert.equal(migrated.framework.length > 0, true);
  assert.equal(Array.isArray(migrated.recommendations), true);
});

test('framework recovery and regression report track improvements across runs', () => {
  const framework = createUniversalCrossTopicLearningQualityTestingFramework({
    persistenceKey: 'daksha.learning.quality.testing.test'
  });

  const first = framework.run({
    sourceType: 'audio',
    topic: 'First run topic',
    text: 'Short overview'
  });

  const second = framework.run({
    sourceType: 'audio',
    topic: 'Second run topic',
    text: 'Longer overview with additional concepts checkpoints interactions and structured progression steps.',
    steps: [
      { id: 'a', title: 'Intro', order: 0, duration: 3 },
      { id: 'b', title: 'Middle', order: 1, duration: 3 },
      { id: 'c', title: 'Advanced', order: 2, duration: 3 }
    ],
    checkpoints: [{ id: 'c1', stepId: 'a', type: 'intro' }]
  });

  assert.equal(first.validation.valid, true);
  assert.equal(second.validation.valid, true);
  assert.equal(typeof second.report.regressionReport.improvementScore, 'number');
  assert.equal(second.snapshot.summary.runCount >= 2, true);

  const recovered = createUniversalCrossTopicLearningQualityTestingFramework({
    persistenceKey: 'daksha.learning.quality.testing.test'
  });

  assert.equal(recovered.snapshot().summary.runCount >= 2, true);
});
