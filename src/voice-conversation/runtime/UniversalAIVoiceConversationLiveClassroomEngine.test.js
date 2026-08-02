import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createUniversalAIVoiceConversationLiveClassroomEngine,
  runUniversalAIVoiceConversationLiveClassroomEngine,
  validateUniversalAIVoiceConversationOutput,
  serializeUniversalAIVoiceConversationOutput,
  deserializeUniversalAIVoiceConversationOutput,
  migrateUniversalAIVoiceConversationOutput
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
      lessonId: 'lesson-voice-1',
      title: 'Collaborative Problem Solving',
      language: 'English',
      topics: ['Problem Decomposition', 'Tradeoffs'],
      keyConcepts: ['Problem Decomposition', 'Tradeoffs', 'Evaluation'],
      learningObjectives: ['Analyze problem constraints', 'Compare solution approaches']
    },
    timeline: {
      clips: [
        { id: 'clip-1', start: 0, duration: 1000 },
        { id: 'clip-2', start: 1000, duration: 1200 }
      ]
    },
    aiTeacherEvents: [{ id: 't1', type: 'teacher-guidance' }],
    knowledgeGraph: {
      nodes: [{ id: 'k1', label: 'Problem Decomposition' }, { id: 'k2', label: 'Tradeoffs' }],
      edges: [{ from: 'k1', to: 'k2' }]
    },
    learningAnalytics: {
      output: {
        masteryScore: 0.63,
        learningConfidence: 0.58
      }
    },
    userProfile: {
      learningLevel: 'intermediate',
      preferredLanguage: 'English',
      supportedLanguages: ['English', 'Hindi']
    },
    personalization: {
      output: {
        adaptivePacing: {
          recommendedPace: 1.1
        }
      }
    },
    interactionEvents: [
      { id: 'i1', type: 'question' },
      { id: 'i2', type: 'answer' }
    ],
    assessmentResults: {
      output: {
        mistakes: 1,
        masteryScore: 0.62,
        learningConfidence: 0.56
      }
    },
    participants: [
      { id: 'p1', role: 'teacher', displayName: 'Instructor' },
      { id: 'p2', role: 'student', displayName: 'Learner A' }
    ],
    conversationTypes: ['one-to-one-ai-tutor'],
    conversationCapabilities: ['explain', 'ask', 'answer', 'clarify', 'coach'],
    ...overrides
  };
}

test('one-to-one tutoring conversation metadata is generated', () => {
  const result = runUniversalAIVoiceConversationLiveClassroomEngine(createInput(), {
    runtime: { metadata: {} }
  });

  assert.equal(result.validation.valid, true);
  assert.equal(result.output.conversationTypes.activeConversationTypes.includes('one-to-one-ai-tutor'), true);
  assert.equal(Array.isArray(result.output.turnMetadata), true);
  assert.equal(Array.isArray(result.output.runtimeGraphEvents), true);
});

test('classroom and group discussion sessions are supported', () => {
  const result = runUniversalAIVoiceConversationLiveClassroomEngine(createInput({
    participants: [
      { id: 'p1', role: 'teacher', displayName: 'Instructor' },
      { id: 'p2', role: 'student', displayName: 'Student A' },
      { id: 'p3', role: 'student', displayName: 'Student B' },
      { id: 'p4', role: 'student', displayName: 'Student C' }
    ],
    conversationTypes: ['one-to-many-classroom', 'student-groups', 'discussion-session', 'live-q-and-a']
  }), { runtime: { metadata: {} } });

  assert.equal(result.validation.valid, true);
  assert.equal(result.output.classroomSessionMetadata.participantCount, 4);
  assert.equal(Array.isArray(result.output.discussionEvents), true);
  assert.equal(Array.isArray(result.output.collaborationEvents), true);
});

test('multilingual conversation metadata is supported', () => {
  const result = runUniversalAIVoiceConversationLiveClassroomEngine(createInput({
    userProfile: {
      learningLevel: 'beginner',
      preferredLanguage: 'Hindi',
      supportedLanguages: ['Hindi', 'English', 'Spanish']
    },
    preferredLanguages: ['Hindi', 'English']
  }), {
    runtime: { metadata: {} }
  });

  assert.equal(result.validation.valid, true);
  assert.equal(result.output.language, 'Hindi');
  assert.equal(result.output.supportedLanguages.includes('Hindi'), true);
});

test('interruption and reconnect recovery metadata are supported', () => {
  const adapter = createMemoryAdapter();
  const runtime = { metadata: {} };
  const engine = createUniversalAIVoiceConversationLiveClassroomEngine(runtime, {
    persistenceAdapter: adapter,
    persistenceKey: 'daksha.voice.conversation.recovery.test'
  });

  const generated = engine.generate(createInput());
  assert.equal(generated.validation.valid, true);

  assert.equal(engine.markInterrupted('test-interrupt'), true);
  assert.equal(engine.markDisconnected('test-reconnect'), true);
  assert.equal(engine.markOffline('test-offline'), true);

  const resumed = engine.resumeFromCheckpoint('checkpoint-voice-1');
  assert.equal(resumed.result.validation.valid, true);

  const persisted = engine.persistSession();
  assert.equal(persisted, true);

  const recoveredEngine = createUniversalAIVoiceConversationLiveClassroomEngine(runtime, {
    persistenceAdapter: adapter,
    persistenceKey: 'daksha.voice.conversation.recovery.test'
  });

  assert.equal(recoveredEngine.recoverSession(), true);
  assert.equal(recoveredEngine.snapshot().diagnostics.recoveries >= 1, true);
});

test('unknown future conversation types are preserved without code changes', () => {
  const result = runUniversalAIVoiceConversationLiveClassroomEngine(createInput({
    conversationTypes: ['quantum-holo-classroom', 'agent-swarm-dialogue', 'one-to-one-ai-tutor']
  }), {
    runtime: { metadata: {} }
  });

  assert.equal(result.validation.valid, true);
  const unknown = result.output.conversationTypes.unknownFutureConversationTypes;
  assert.equal(unknown.includes('quantum-holo-classroom'), true);
  assert.equal(unknown.includes('agent-swarm-dialogue'), true);
});

test('validation serialization migration and backward compatibility work', () => {
  const result = runUniversalAIVoiceConversationLiveClassroomEngine(createInput(), {
    runtime: { metadata: {} }
  });

  const validation = validateUniversalAIVoiceConversationOutput(result.output);
  assert.equal(validation.valid, true);

  const serialized = serializeUniversalAIVoiceConversationOutput(result.output);
  const deserialized = deserializeUniversalAIVoiceConversationOutput(serialized);
  assert.equal(deserialized.validation.valid, true);

  const migrated = migrateUniversalAIVoiceConversationOutput({
    lessonId: 'legacy-lesson',
    title: 'Legacy conversation metadata',
    conversationTypes: ['legacy-open-session']
  });

  assert.equal(migrated.lessonId, 'legacy-lesson');
  assert.equal(Array.isArray(migrated.runtimeGraphEvents), true);

  const fallback = deserializeUniversalAIVoiceConversationOutput('invalid-json');
  assert.equal(fallback.validation.valid, false);
  assert.equal(fallback.validation.status, 'fallback');
});
