import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createUniversalCollaborativeLearningGroupTeachingEngine,
  runUniversalCollaborativeLearningGroupTeachingEngine,
  validateUniversalCollaborativeLearningOutput,
  serializeUniversalCollaborativeLearningOutput,
  deserializeUniversalCollaborativeLearningOutput,
  migrateUniversalCollaborativeLearningOutput
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
      lessonId: 'lesson-collab-1',
      title: 'Collaborative Systems Design',
      language: 'English',
      learningObjectives: ['Coordinate a shared solution', 'Review peers effectively'],
      keyConcepts: ['Systems Thinking', 'Feedback Loop']
    },
    curriculumGraph: {
      title: 'Team-Based Design',
      learningObjectives: ['Assign roles', 'Align decisions']
    },
    knowledgeGraph: {
      nodes: [{ id: 'k1', label: 'Systems Thinking' }, { id: 'k2', label: 'Feedback Loop' }],
      edges: [{ from: 'k1', to: 'k2' }]
    },
    learningAnalytics: {
      output: {
        masteryScore: 0.66,
        learningConfidence: 0.61,
        engagementScore: 0.68,
        contributionScore: 0.7
      }
    },
    assessmentResults: {
      output: {
        masteryScore: 0.64,
        learningConfidence: 0.58,
        mistakes: 2
      }
    },
    userProfiles: [
      { id: 'p1', participantId: 'p1', role: 'teacher', participantType: 'teacher', displayName: 'Instructor', preferredLanguage: 'English' },
      { id: 'p2', participantId: 'p2', role: 'student', participantType: 'learner', displayName: 'Student A', preferredLanguage: 'English' },
      { id: 'p3', participantId: 'p3', role: 'student', participantType: 'learner', displayName: 'Student B', preferredLanguage: 'Hindi' }
    ],
    collaborationModels: ['one-teacher-many-students', 'small-study-group'],
    participantTypes: ['teacher', 'learner', 'mentor'],
    capabilities: ['collaborate', 'discuss', 'review', 'moderate', 'mentor'],
    collaborationEvents: [{ id: 'event-1', type: 'discussion-start', participantType: 'learner' }],
    sessionState: {
      engagementScore: 0.72,
      contributionScore: 0.74
    },
    ...overrides
  };
}

test('classroom collaboration metadata is generated with runtime graph events', () => {
  const result = runUniversalCollaborativeLearningGroupTeachingEngine(createInput(), {
    runtime: { metadata: {} }
  });

  assert.equal(result.validation.valid, true);
  assert.equal(Array.isArray(result.output.runtimeGraphEvents), true);
  assert.equal(result.output.classroomMetadata.participantCount >= 3, true);
  assert.equal(result.output.collaborationModels.activeCollaborationModels.includes('one-teacher-many-students'), true);
});

test('study groups and peer review collaboration metadata is supported', () => {
  const result = runUniversalCollaborativeLearningGroupTeachingEngine(createInput({
    collaborationModels: ['small-study-group', 'peer-review', 'project-collaboration'],
    userProfiles: [
      { id: 't1', participantId: 't1', role: 'teacher', participantType: 'teacher', displayName: 'Lead Teacher' },
      { id: 's1', participantId: 's1', role: 'student', participantType: 'learner', displayName: 'Student 1', preferredLanguage: 'English' },
      { id: 's2', participantId: 's2', role: 'student', participantType: 'learner', displayName: 'Student 2', preferredLanguage: 'Spanish' },
      { id: 's3', participantId: 's3', role: 'reviewer', participantType: 'reviewer', displayName: 'Reviewer', preferredLanguage: 'Hindi' }
    ]
  }), {
    runtime: { metadata: {} }
  });

  assert.equal(result.validation.valid, true);
  assert.equal(Array.isArray(result.output.reviewEvents), true);
  assert.equal(Array.isArray(result.output.feedbackEvents), true);
  assert.equal(result.output.groupMetadata.teamSize >= 4, true);
});

test('role management and permissions are generated for multiple participant roles', () => {
  const result = runUniversalCollaborativeLearningGroupTeachingEngine(createInput({
    userProfiles: [
      { id: 'teacher', participantId: 'teacher', role: 'teacher', participantType: 'teacher', displayName: 'Teacher', permissions: ['moderate', 'assign'] },
      { id: 'mentor', participantId: 'mentor', role: 'mentor', participantType: 'mentor', displayName: 'Mentor', permissions: ['coach', 'mentor'] },
      { id: 'student', participantId: 'student', role: 'student', participantType: 'learner', displayName: 'Student', permissions: ['discuss', 'review'] }
    ],
    capabilities: ['collaborate', 'assign', 'mentor', 'coach', 'evaluate']
  }), {
    runtime: { metadata: {} }
  });

  assert.equal(result.validation.valid, true);
  assert.ok(result.output.roles.some((role) => role.role === 'teacher'));
  assert.ok(result.output.permissions.some((entry) => entry.permissions.includes('assign')));
});

test('synchronization and interruption recovery metadata are supported', () => {
  const adapter = createMemoryAdapter();
  const runtime = { metadata: {} };
  const engine = createUniversalCollaborativeLearningGroupTeachingEngine(runtime, {
    persistenceAdapter: adapter,
    persistenceKey: 'daksha.collaboration.recovery.test'
  });

  const generated = engine.generate(createInput());
  assert.equal(generated.validation.valid, true);

  assert.equal(engine.markInterrupted('manual-test'), true);
  assert.equal(engine.markDisconnected('manual-disconnect'), true);
  assert.equal(engine.markOffline('manual-offline'), true);

  const resumed = engine.resumeFromCheckpoint('checkpoint-collab-1');
  assert.equal(resumed.result.validation.valid, true);

  assert.equal(engine.persistSession(), true);

  const recoveredEngine = createUniversalCollaborativeLearningGroupTeachingEngine(runtime, {
    persistenceAdapter: adapter,
    persistenceKey: 'daksha.collaboration.recovery.test'
  });

  assert.equal(recoveredEngine.recoverSession(), true);
  assert.equal(recoveredEngine.snapshot().diagnostics.recoveries >= 1, true);
});

test('multilingual collaboration metadata is supported', () => {
  const result = runUniversalCollaborativeLearningGroupTeachingEngine(createInput({
    preferredLanguages: ['Hindi', 'English', 'Spanish'],
    userProfiles: [
      { id: 'u1', participantId: 'u1', role: 'teacher', participantType: 'teacher', displayName: 'Teacher', preferredLanguage: 'Hindi' },
      { id: 'u2', participantId: 'u2', role: 'student', participantType: 'learner', displayName: 'Student', preferredLanguage: 'English' }
    ]
  }), {
    runtime: { metadata: {} }
  });

  assert.equal(result.validation.valid, true);
  assert.equal(result.output.language, 'Hindi');
  assert.equal(result.output.supportedLanguages.includes('Hindi'), true);
});

test('unknown future participant types are preserved automatically', () => {
  const result = runUniversalCollaborativeLearningGroupTeachingEngine(createInput({
    participantTypes: ['quantum-lab-mentor', 'future-participant-role'],
    userProfiles: [
      { id: 'u1', participantId: 'u1', role: 'teacher', participantType: 'teacher', displayName: 'Teacher' },
      { id: 'u2', participantId: 'u2', role: 'chromatic-mentor', participantType: 'chromatic-mentor', displayName: 'Future Mentor' }
    ]
  }), {
    runtime: { metadata: {} }
  });

  assert.equal(result.validation.valid, true);
  assert.equal(Array.isArray(result.output.participantTypes.unknownFutureParticipantTypes), true);
});

test('validation', () => {
  const result = runUniversalCollaborativeLearningGroupTeachingEngine(createInput(), {
    runtime: { metadata: {} }
  });

  const validation = validateUniversalCollaborativeLearningOutput(result.output);
  assert.equal(validation.valid, true);

  const serialized = serializeUniversalCollaborativeLearningOutput(result.output);
  const deserialized = deserializeUniversalCollaborativeLearningOutput(serialized);
  assert.equal(deserialized.validation.valid, true);

  const migrated = migrateUniversalCollaborativeLearningOutput({
    lessonId: 'legacy-collab',
    title: 'Legacy Collaboration Session',
    collaborationModels: ['legacy-session'],
    participants: [{ participantId: 'x1', role: 'learner', name: 'Legacy Student' }]
  });

  assert.equal(migrated.lessonId, 'legacy-collab');
  assert.equal(Array.isArray(migrated.runtimeGraphEvents), true);

  const fallback = deserializeUniversalCollaborativeLearningOutput('invalid-json');
  assert.equal(fallback.validation.valid, false);
  assert.equal(fallback.validation.status, 'fallback');
});
