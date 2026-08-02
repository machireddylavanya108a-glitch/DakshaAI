import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createUniversalMultimodalAITutorLiveTeachingEngine,
  runUniversalMultimodalAITutorLiveTeachingEngine,
  validateUniversalMultimodalAITutorOutput,
  serializeUniversalMultimodalAITutorOutput,
  deserializeUniversalMultimodalAITutorOutput,
  migrateUniversalMultimodalAITutorOutput
} from './index.js';

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

function createFixtureInput(overrides = {}) {
  return {
    lessonGraph: {
      lessonId: 'lesson-multimodal-1',
      title: 'Adaptive Systems Thinking',
      language: 'English',
      topics: ['Systems', 'Feedback Loops'],
      keyConcepts: ['Systems', 'Feedback Loops', 'Stability'],
      learningObjectives: ['Understand systems', 'Apply feedback loops']
    },
    runtimeGraph: {
      nodes: [{ id: 'n1' }, { id: 'n2' }, { id: 'n3' }],
      edges: [{ from: 'n1', to: 'n2' }, { from: 'n2', to: 'n3' }]
    },
    timeline: {
      clips: [
        { id: 'clip-1', start: 0, duration: 1200 },
        { id: 'clip-2', start: 1200, duration: 1400 }
      ]
    },
    aiTeacherMetadata: {
      output: {
        teachingCapabilities: ['explain', 'coach']
      }
    },
    knowledgeGraph: {
      nodes: [{ id: 'k1', label: 'Systems' }, { id: 'k2', label: 'Feedback Loops' }],
      edges: [{ from: 'k1', to: 'k2' }]
    },
    userLearningProfile: {
      language: 'English',
      preferredLanguage: 'English',
      preferredModalities: ['text', 'diagram-metadata']
    },
    learningAnalytics: {
      output: {
        masteryScore: 0.62,
        learningConfidence: 0.55,
        learningProgress: {
          lessonCompletion: 0.5
        }
      }
    },
    interactionEvents: [
      { id: 'evt-1', type: 'interaction-click' },
      { id: 'evt-2', type: 'interaction-answer' }
    ],
    assessmentResults: {
      output: {
        mistakes: 2,
        masteryScore: 0.58,
        completionScore: 0.52,
        learningConfidence: 0.49
      }
    },
    learningGoals: ['Apply systems thinking to real scenarios'],
    modalities: ['text', 'voice-metadata', 'image-metadata', 'diagram-metadata', 'animation-metadata', '3d-scene-metadata', 'interaction-metadata', 'quiz-metadata'],
    tutorCapabilities: ['explain', 'demonstrate', 'compare', 'visualize', 'simplify', 'expand', 'ask-questions', 'give-hints', 'recap', 'revise', 'motivate', 'challenge', 'coach'],
    ...overrides
  };
}

test('adaptive tutoring output responds to learner state', () => {
  const result = runUniversalMultimodalAITutorLiveTeachingEngine(createFixtureInput({
    assessmentResults: {
      output: {
        mistakes: 5,
        masteryScore: 0.34,
        completionScore: 0.41,
        learningConfidence: 0.32
      }
    }
  }), { runtime: { metadata: {} } });

  assert.equal(result.validation.valid, true);
  assert.equal(result.output.adaptiveTutoring.adaptationMode, 'guided-recovery');
  assert.equal(result.output.teachingPlan.mode, 'guided-recovery');
  assert.equal(Array.isArray(result.output.runtimeGraphEvents), true);
  assert.equal(result.output.runtimeGraphEvents.length > 0, true);
});

test('interruption recovery and session continuation are supported', () => {
  const adapter = createMemoryAdapter();
  const runtime = { metadata: {} };
  const engine = createUniversalMultimodalAITutorLiveTeachingEngine(runtime, {
    persistenceAdapter: adapter,
    persistenceKey: 'daksha.multimodal.tutor.recovery.test'
  });

  const generated = engine.generate(createFixtureInput());
  assert.equal(generated.validation.valid, true);

  const interrupted = engine.markInterrupted('manual-test');
  assert.equal(interrupted, true);

  const resumed = engine.resumeFromCheckpoint('checkpoint-1');
  assert.equal(resumed.result.validation.valid, true);

  const persisted = engine.persistSession();
  assert.equal(persisted, true);

  const recoveredEngine = createUniversalMultimodalAITutorLiveTeachingEngine(runtime, {
    persistenceAdapter: adapter,
    persistenceKey: 'daksha.multimodal.tutor.recovery.test'
  });

  const recovered = recoveredEngine.recoverSession();
  assert.equal(recovered, true);
  assert.equal(recoveredEngine.snapshot().diagnostics.recoveries >= 1, true);
});

test('multilingual tutoring metadata is supported', () => {
  const result = runUniversalMultimodalAITutorLiveTeachingEngine(createFixtureInput({
    userLearningProfile: {
      language: 'Hindi',
      preferredLanguage: 'Hindi',
      supportedLanguages: ['Hindi', 'English']
    },
    supportedLanguages: ['Hindi', 'English', 'Spanish']
  }), { runtime: { metadata: {} } });

  assert.equal(result.validation.valid, true);
  assert.equal(result.output.language, 'Hindi');
  assert.equal(result.output.supportedLanguages.includes('Hindi'), true);
});

test('multimodal metadata emits required metadata-only cues and prompts', () => {
  const result = runUniversalMultimodalAITutorLiveTeachingEngine(createFixtureInput(), {
    runtime: { metadata: {} }
  });

  assert.equal(result.validation.valid, true);
  assert.equal(Array.isArray(result.output.visualTeachingCues), true);
  assert.equal(Array.isArray(result.output.sceneCues), true);
  assert.equal(Array.isArray(result.output.timelineCues), true);
  assert.equal(Array.isArray(result.output.interactionCues), true);
  assert.equal(Array.isArray(result.output.questionPrompts), true);
  assert.equal(Array.isArray(result.output.practicePrompts), true);
  assert.equal(Array.isArray(result.output.reflectionPrompts), true);
  assert.equal(Array.isArray(result.output.checkpointPrompts), true);
  assert.equal(Array.isArray(result.output.revisionPrompts), true);
});

test('unknown future teaching modalities are preserved without code changes', () => {
  const result = runUniversalMultimodalAITutorLiveTeachingEngine(createFixtureInput({
    modalities: ['quantum-sense-metadata', 'haptic-graph-layer', 'text']
  }), {
    runtime: { metadata: {} }
  });

  assert.equal(result.validation.valid, true);
  const futureModalities = result.output.teachingModalities.unknownFutureTeachingModalities;
  assert.equal(futureModalities.includes('quantum-sense-metadata'), true);
  assert.equal(futureModalities.includes('haptic-graph-layer'), true);
});

test('validation serialization migration and backward compatibility work', () => {
  const result = runUniversalMultimodalAITutorLiveTeachingEngine(createFixtureInput(), {
    runtime: { metadata: {} }
  });

  const validation = validateUniversalMultimodalAITutorOutput(result.output);
  assert.equal(validation.valid, true);

  const serialized = serializeUniversalMultimodalAITutorOutput(result.output);
  const deserialized = deserializeUniversalMultimodalAITutorOutput(serialized);
  assert.equal(deserialized.validation.valid, true);

  const migrated = migrateUniversalMultimodalAITutorOutput({
    lessonId: 'legacy-lesson',
    title: 'Legacy tutor payload',
    modalities: ['legacy-hologram-mode']
  });

  assert.equal(migrated.lessonId, 'legacy-lesson');
  assert.equal(Array.isArray(migrated.runtimeGraphEvents), true);

  const fallback = deserializeUniversalMultimodalAITutorOutput('invalid-json');
  assert.equal(fallback.validation.valid, false);
  assert.equal(fallback.validation.status, 'fallback');
});
