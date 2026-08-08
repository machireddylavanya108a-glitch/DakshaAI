import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createUniversalAIMentorCoachInterviewerEngine,
  runUniversalAIMentorCoachInterviewerEngine,
  validateUniversalAIMentorCoachInterviewerOutput,
  serializeUniversalAIMentorCoachInterviewerOutput,
  deserializeUniversalAIMentorCoachInterviewerOutput,
  migrateUniversalAIMentorCoachInterviewerOutput
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

function createInput(overrides = {}) {
  return {
    runtimeGraph: {
      nodes: [{ id: 'n1' }, { id: 'n2' }, { id: 'n3' }],
      edges: [{ from: 'n1', to: 'n2' }, { from: 'n2', to: 'n3' }]
    },
    lessonGraph: {
      lessonId: 'mentor-lesson-1',
      title: 'Adaptive Systems Design',
      language: 'English',
      keyConcepts: ['Systems', 'Design Tradeoffs'],
      learningObjectives: ['Explain systems design choices', 'Assess tradeoffs']
    },
    curriculumGraph: {
      topics: [{ id: 'topic-1', title: 'Systems' }],
      skillMap: [{ id: 'skill-1', skill: 'Architecture Reasoning' }]
    },
    knowledgeGraph: {
      nodes: [{ id: 'k1', label: 'Systems' }, { id: 'k2', label: 'Tradeoffs' }],
      edges: [{ from: 'k1', to: 'k2' }]
    },
    learningAnalytics: {
      output: {
        masteryScore: 0.62,
        learningConfidence: 0.58
      }
    },
    assessmentResults: {
      output: {
        mistakes: 2,
        masteryScore: 0.61,
        learningConfidence: 0.57
      }
    },
    aiTeacherEvents: [{ id: 'evt-1', type: 'teacher-guidance' }],
    userProfile: {
      learningLevel: 'intermediate',
      preferredLanguage: 'English',
      supportedLanguages: ['English', 'Hindi'],
      communicationAbility: 0.64,
      careerGoals: ['Architecture Engineer']
    },
    personalization: {
      output: {
        adaptivePacing: {
          recommendedPace: 1.1
        }
      }
    },
    timelineEvents: [{ id: 'tl-1', type: 'timeline-step' }],
    sessionHistory: [{ sessionId: 's1', durationMinutes: 25 }],
    interactionEvents: [{ id: 'i1', type: 'interaction' }],
    mentorTypes: ['universal-mentor', 'skill-coach', 'technical-interview'],
    capabilities: ['mentor', 'coach', 'interview', 'evaluate', 'forecast'],
    ...overrides
  };
}

test('mentoring sessions generate mentor and coaching metadata', () => {
  const result = runUniversalAIMentorCoachInterviewerEngine(createInput(), {
    runtime: { metadata: {} }
  });

  assert.equal(result.validation.valid, true);
  assert.equal(Array.isArray(result.output.mentorPlan), true);
  assert.equal(Array.isArray(result.output.coachingPlan), true);
  assert.equal(Array.isArray(result.output.mentorEvents), true);
});

test('coaching and adaptive recommendations include competency tracking', () => {
  const result = runUniversalAIMentorCoachInterviewerEngine(createInput({
    assessmentResults: {
      output: {
        mistakes: 5,
        masteryScore: 0.34,
        learningConfidence: 0.35
      }
    }
  }), {
    runtime: { metadata: {} }
  });

  assert.equal(result.validation.valid, true);
  assert.equal(Array.isArray(result.output.skillGapAnalysis), true);
  assert.equal(Array.isArray(result.output.competencyMatrix), true);
  assert.equal(Array.isArray(result.output.learningRecommendations), true);
  assert.equal(typeof result.output.progressForecast, 'object');
});

test('interview sessions generate adaptive interview plans and events', () => {
  const result = runUniversalAIMentorCoachInterviewerEngine(createInput({
    mentorTypes: ['mock-interview', 'technical-interview', 'behavioral-interview'],
    capabilities: ['interview', 'assess', 'score', 'review']
  }), {
    runtime: { metadata: {} }
  });

  assert.equal(result.validation.valid, true);
  assert.equal(Array.isArray(result.output.interviewPlan), true);
  assert.equal(Array.isArray(result.output.interviewEvents), true);
  assert.equal(Array.isArray(result.output.adaptiveInterviewQuestions), true);
});

test('multilingual mentoring metadata is supported', () => {
  const result = runUniversalAIMentorCoachInterviewerEngine(createInput({
    preferredLanguage: 'Hindi',
    userProfile: {
      learningLevel: 'beginner',
      preferredLanguage: 'Hindi',
      supportedLanguages: ['Hindi', 'English']
    }
  }), {
    runtime: { metadata: {} }
  });

  assert.equal(result.validation.valid, true);
  assert.equal(result.output.language, 'Hindi');
  assert.equal(result.output.supportedLanguages.includes('Hindi'), true);
});

test('interruption recovery and session continuation are supported', () => {
  const adapter = createMemoryAdapter();
  const runtime = { metadata: {} };
  const engine = createUniversalAIMentorCoachInterviewerEngine(runtime, {
    persistenceAdapter: adapter,
    persistenceKey: 'daksha.mentor.coach.recovery.test'
  });

  const generated = engine.generate(createInput());
  assert.equal(generated.validation.valid, true);

  assert.equal(engine.markInterrupted('manual-test'), true);
  const resumed = engine.resumeFromCheckpoint('checkpoint-mentor-1');
  assert.equal(resumed.result.validation.valid, true);

  assert.equal(engine.persistSession(), true);

  const recoveredEngine = createUniversalAIMentorCoachInterviewerEngine(runtime, {
    persistenceAdapter: adapter,
    persistenceKey: 'daksha.mentor.coach.recovery.test'
  });

  assert.equal(recoveredEngine.recoverSession(), true);
  assert.equal(recoveredEngine.snapshot().diagnostics.recoveries >= 1, true);
});

test('unknown future mentor types are preserved automatically', () => {
  const result = runUniversalAIMentorCoachInterviewerEngine(createInput({
    mentorTypes: ['holographic-mentor-swarm', 'quantum-case-interviewer', 'universal-mentor']
  }), {
    runtime: { metadata: {} }
  });

  assert.equal(result.validation.valid, true);
  const unknown = result.output.mentorTypes.unknownFutureMentorTypes;
  assert.equal(unknown.includes('holographic-mentor-swarm'), true);
  assert.equal(unknown.includes('quantum-case-interviewer'), true);
});

test('validation serialization migration and backward compatibility work', () => {
  const result = runUniversalAIMentorCoachInterviewerEngine(createInput(), {
    runtime: { metadata: {} }
  });

  const validation = validateUniversalAIMentorCoachInterviewerOutput(result.output);
  assert.equal(validation.valid, true);

  const serialized = serializeUniversalAIMentorCoachInterviewerOutput(result.output);
  const deserialized = deserializeUniversalAIMentorCoachInterviewerOutput(serialized);
  assert.equal(deserialized.validation.valid, true);

  const migrated = migrateUniversalAIMentorCoachInterviewerOutput({
    lessonId: 'legacy-lesson',
    title: 'Legacy mentor payload',
    mentorTypes: ['legacy-mentor-open-type']
  });

  assert.equal(migrated.lessonId, 'legacy-lesson');
  assert.equal(Array.isArray(migrated.runtimeGraphEvents), true);

  const fallback = deserializeUniversalAIMentorCoachInterviewerOutput('invalid-json');
  assert.equal(fallback.validation.valid, false);
  assert.equal(fallback.validation.status, 'fallback');
});
