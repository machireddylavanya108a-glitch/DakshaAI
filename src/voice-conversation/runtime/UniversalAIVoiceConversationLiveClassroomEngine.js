import {
  UNIVERSAL_AI_VOICE_CONVERSATION_SCHEMA_VERSION,
  SUPPORTED_BASE_CONVERSATION_TYPES,
  SUPPORTED_BASE_CONVERSATION_CAPABILITIES,
  DEFAULT_UNIVERSAL_AI_VOICE_CONVERSATION_CONFIG,
  isObject,
  asArray,
  safeString,
  toFiniteNumber,
  clamp,
  uniqueStrings,
  normalizeConversationType,
  normalizeConversationCapability
} from './UniversalAIVoiceConversationLiveClassroomEngineConfig.js';

const STORE_KEY = '__daksha_universal_ai_voice_conversation_store__';

function createInMemoryStore() {
  if (!globalThis[STORE_KEY]) {
    globalThis[STORE_KEY] = new Map();
  }

  const store = globalThis[STORE_KEY];
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

function createDefaultPersistenceAdapter() {
  const local = globalThis?.localStorage;
  if (local && typeof local.getItem === 'function' && typeof local.setItem === 'function') {
    return local;
  }
  return createInMemoryStore();
}

function parsePayload(value) {
  if (!value) return null;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  return isObject(value) ? value : null;
}

function inferRuntimeGraphSummary(runtimeGraph = {}) {
  if (typeof runtimeGraph?.getNodeCount === 'function' || typeof runtimeGraph?.getRelationshipCount === 'function') {
    return {
      nodeCount: Math.max(0, toFiniteNumber(runtimeGraph?.getNodeCount?.(), 0)),
      relationshipCount: Math.max(0, toFiniteNumber(runtimeGraph?.getRelationshipCount?.(), 0))
    };
  }

  const nodes = asArray(runtimeGraph?.nodes || runtimeGraph?.lessonGraph?.nodes);
  const edges = asArray(runtimeGraph?.edges || runtimeGraph?.lessonGraph?.edges);
  return {
    nodeCount: nodes.length,
    relationshipCount: edges.length
  };
}

function createDefaultState() {
  return {
    schemaVersion: UNIVERSAL_AI_VOICE_CONVERSATION_SCHEMA_VERSION,
    status: 'Ready',
    output: null,
    diagnostics: {
      runs: 0,
      recoveries: 0,
      persistedSessions: 0,
      warnings: [],
      latestDurationMs: 0
    },
    recovery: {
      interrupted: false,
      disconnected: false,
      offline: false,
      checkpointId: null,
      resumeTimeMs: 0,
      resumeCount: 0
    },
    history: {
      conversationTurns: [],
      runtimeEvents: []
    },
    participantSync: {
      version: 0,
      participants: []
    }
  };
}

function pushHistory(state = {}, entry = {}, maxHistory = 1500, target = 'runtimeEvents') {
  const history = isObject(state.history) ? state.history : { conversationTurns: [], runtimeEvents: [] };
  const bucket = asArray(history[target]);
  bucket.push(entry);
  while (bucket.length > maxHistory) {
    bucket.shift();
  }
  history[target] = bucket;
  state.history = history;
}

function resolveInput(runtime = {}, input = {}) {
  return {
    runtimeGraph: isObject(input.runtimeGraph) ? input.runtimeGraph : runtime?.graph || {},
    lessonGraph: isObject(input.lessonGraph) ? input.lessonGraph : runtime?.metadata?.lessonGraph || {},
    timeline: isObject(input.timeline) ? input.timeline : runtime?.metadata?.timeline || runtime?.metadata?.timelineData || {},
    aiTeacherEvents: asArray(input.aiTeacherEvents).length ? asArray(input.aiTeacherEvents) : asArray(runtime?.metadata?.aiTeacherAdapter?.runtimeState?.history?.recentEvents),
    knowledgeGraph: isObject(input.knowledgeGraph) ? input.knowledgeGraph : runtime?.metadata?.knowledgeMemoryAdapter?.output?.knowledgeGraph || {},
    learningAnalytics: isObject(input.learningAnalytics) ? input.learningAnalytics : runtime?.metadata?.learningAnalyticsAdapter || {},
    userProfile: isObject(input.userProfile) ? input.userProfile : runtime?.metadata?.userLearningProfile || runtime?.metadata?.learningProfile || {},
    personalization: isObject(input.personalization) ? input.personalization : runtime?.metadata?.personalizationAdaptiveAdapter || {},
    interactionEvents: asArray(input.interactionEvents).length ? asArray(input.interactionEvents) : asArray(runtime?.sceneEventRuntime?.events),
    assessmentResults: isObject(input.assessmentResults) ? input.assessmentResults : runtime?.metadata?.assessmentAdapter || {},
    pipeline: isObject(input.pipeline) ? input.pipeline : runtime?.metadata?.pipeline || runtime?.metadata?.sourceMeta || {},
    learningIntent: isObject(input.learningIntent) ? input.learningIntent : runtime?.metadata?.intentProfile || runtime?.metadata?.learningIntent || {},
    conversationTypes: asArray(input.conversationTypes),
    conversationCapabilities: asArray(input.conversationCapabilities),
    participants: asArray(input.participants),
    preferredLanguages: asArray(input.preferredLanguages),
    futureModalities: asArray(input.futureModalities),
    classroomMode: safeString(input.classroomMode || '')
  };
}

function resolveLanguages(source = {}, options = {}) {
  const selectedLanguage = safeString(
    source.userProfile?.preferredLanguage
    || source.userProfile?.language
    || source.lessonGraph?.language
    || source.learningIntent?.language
    || options.defaultLanguage
    || 'English'
  ) || 'English';

  const supportedLanguages = uniqueStrings([
    ...asArray(source.preferredLanguages),
    ...asArray(source.userProfile?.supportedLanguages),
    ...asArray(source.pipeline?.supportedLanguages),
    selectedLanguage
  ], 80);

  return {
    selectedLanguage,
    supportedLanguages
  };
}

function resolveConversationTypes(source = {}) {
  const requested = uniqueStrings([
    ...asArray(source.conversationTypes),
    ...asArray(source.learningIntent?.conversationTypes),
    safeString(source.classroomMode),
    ...SUPPORTED_BASE_CONVERSATION_TYPES
  ], 400);

  const normalized = requested.map((item) => normalizeConversationType(item));
  return {
    activeConversationTypes: uniqueStrings(normalized.map((item) => item.conversationType), 400),
    unknownFutureConversationTypes: uniqueStrings(
      normalized.filter((item) => !item.known).map((item) => item.conversationType),
      260
    )
  };
}

function resolveConversationCapabilities(source = {}) {
  const requested = uniqueStrings([
    ...asArray(source.conversationCapabilities),
    ...asArray(source.learningIntent?.conversationCapabilities),
    ...asArray(source.pipeline?.conversationCapabilities),
    ...SUPPORTED_BASE_CONVERSATION_CAPABILITIES
  ], 400);

  const normalized = requested.map((item) => normalizeConversationCapability(item));
  return {
    enabledConversationCapabilities: uniqueStrings(normalized.map((item) => item.capability), 400),
    unknownConversationCapabilities: uniqueStrings(
      normalized.filter((item) => !item.known).map((item) => item.capability),
      260
    )
  };
}

function computeAdaptiveConversation(source = {}) {
  const analyticsOutput = isObject(source.learningAnalytics?.output) ? source.learningAnalytics.output : source.learningAnalytics;
  const assessmentOutput = isObject(source.assessmentResults?.output) ? source.assessmentResults.output : source.assessmentResults;

  const confidence = clamp(assessmentOutput?.learningConfidence ?? analyticsOutput?.learningConfidence ?? 0.55, 0, 1);
  const mastery = clamp(assessmentOutput?.masteryScore ?? analyticsOutput?.masteryScore ?? 0.55, 0, 1);
  const mistakes = Math.max(0, toFiniteNumber(assessmentOutput?.mistakes ?? analyticsOutput?.mistakes ?? 0, 0));
  const learningSpeed = clamp(
    source.personalization?.output?.adaptivePacing?.recommendedPace
      ?? source.userProfile?.learningSpeed
      ?? source.userProfile?.learningPace
      ?? 1,
    0.4,
    2.5
  );
  const engagement = clamp(
    asArray(source.interactionEvents).length / Math.max(1, asArray(source.interactionEvents).length + mistakes + 3),
    0,
    1
  );
  const learnerLevel = safeString(source.userProfile?.learningLevel || source.userProfile?.level || 'intermediate') || 'intermediate';

  const sessionHistoryCount = asArray(source.personalization?.runtimeState?.history?.recentEvents).length
    + asArray(source.aiTeacherEvents).length
    + asArray(source.interactionEvents).length;

  const conversationMode = mistakes > 3 || confidence < 0.45
    ? 'guided-clarification'
    : mastery > 0.8 && confidence > 0.75
      ? 'challenge-and-debate'
      : 'balanced-coaching';

  return {
    learnerLevel,
    confidence,
    learningSpeed,
    mistakes,
    engagement,
    mastery,
    sessionHistoryCount,
    futureLearnerAttributes: isObject(source.userProfile?.futureLearnerAttributes)
      ? source.userProfile.futureLearnerAttributes
      : {},
    conversationMode
  };
}

function buildParticipants(source = {}, options = {}) {
  const rawParticipants = asArray(source.participants);
  const base = rawParticipants.length
    ? rawParticipants
    : [{
      id: 'participant-1',
      role: 'learner',
      displayName: safeString(source.userProfile?.displayName || source.userProfile?.name || 'Learner') || 'Learner'
    }];

  return base.slice(0, options.maxParticipants).map((participant, index) => ({
    participantId: safeString(participant?.participantId || participant?.id || `participant-${index + 1}`) || `participant-${index + 1}`,
    role: safeString(participant?.role || (index === 0 ? 'learner' : 'participant')) || 'participant',
    displayName: safeString(participant?.displayName || participant?.name || `Participant ${index + 1}`) || `Participant ${index + 1}`,
    speakingPriority: Math.max(1, toFiniteNumber(participant?.speakingPriority, index + 1)),
    language: safeString(participant?.language || source.userProfile?.preferredLanguage || source.userProfile?.language || 'English') || 'English',
    syncVersion: Math.max(1, toFiniteNumber(participant?.syncVersion, 1))
  }));
}

function buildConversationGraph(source = {}, participants = []) {
  const conceptNodes = uniqueStrings([
    ...asArray(source.lessonGraph?.keyConcepts),
    ...asArray(source.lessonGraph?.topics),
    ...asArray(source.knowledgeGraph?.nodes).map((node) => node?.label || node?.id)
  ], 260);

  const participantNodes = participants.map((participant) => ({
    id: `participant:${participant.participantId}`,
    label: participant.displayName,
    kind: 'participant',
    metadata: {
      role: participant.role,
      language: participant.language
    }
  }));

  const topicNodes = conceptNodes.map((concept, index) => ({
    id: `topic:${index + 1}`,
    label: concept,
    kind: 'topic',
    metadata: {
      source: 'lesson-knowledge'
    }
  }));

  const nodes = [...participantNodes, ...topicNodes];
  const edges = [];

  participantNodes.forEach((participantNode, index) => {
    if (!topicNodes.length) return;
    const target = topicNodes[index % topicNodes.length];
    edges.push({
      id: `edge-participant-topic-${index + 1}`,
      from: participantNode.id,
      to: target.id,
      relation: 'engages-with-topic'
    });
  });

  topicNodes.forEach((topicNode, index) => {
    if (index === 0) return;
    edges.push({
      id: `edge-topic-sequence-${index}`,
      from: topicNodes[index - 1].id,
      to: topicNode.id,
      relation: 'next-discussion-focus'
    });
  });

  return {
    nodes,
    edges,
    metadata: {
      schemaVersion: UNIVERSAL_AI_VOICE_CONVERSATION_SCHEMA_VERSION,
      participantCount: participants.length,
      topicCount: topicNodes.length
    }
  };
}

function buildTurnMetadata(participants = [], adaptive = {}, options = {}) {
  const turnCount = Math.min(options.maxTurns, Math.max(4, participants.length * 6));
  const turns = [];

  for (let index = 0; index < turnCount; index += 1) {
    const participant = participants[index % Math.max(1, participants.length)] || participants[0];
    turns.push({
      turnId: `turn-${index + 1}`,
      participantId: participant?.participantId || 'participant-1',
      role: participant?.role || 'participant',
      intent: index % 5 === 0 ? 'ask' : index % 5 === 1 ? 'answer' : index % 5 === 2 ? 'clarify' : index % 5 === 3 ? 'summarize' : 'coach',
      adaptationHint: adaptive.conversationMode,
      language: participant?.language || 'English',
      sequence: index + 1
    });
  }

  return turns;
}

function buildSpeakingQueue(participants = [], options = {}) {
  return participants.slice(0, options.maxQueueEntries).map((participant, index) => ({
    queueId: `queue-${index + 1}`,
    participantId: participant.participantId,
    priority: Math.max(1, toFiniteNumber(participant.speakingPriority, index + 1)),
    status: index === 0 ? 'active' : 'waiting'
  }));
}

function buildEventList(prefix, eventType, turns = [], limit = 300) {
  return asArray(turns).slice(0, limit).map((turn, index) => ({
    eventId: `${prefix}-${index + 1}`,
    eventType,
    turnId: turn.turnId,
    participantId: turn.participantId,
    sequence: index + 1,
    payload: {
      intent: turn.intent,
      adaptationHint: turn.adaptationHint,
      language: turn.language
    }
  }));
}

function buildConversationState(source = {}, participants = [], adaptive = {}, runtimeGraphSummary = {}) {
  return {
    phase: adaptive.conversationMode,
    activeParticipants: participants.length,
    runtimeGraphNodeCount: runtimeGraphSummary.nodeCount,
    runtimeGraphRelationshipCount: runtimeGraphSummary.relationshipCount,
    interactionEventCount: asArray(source.interactionEvents).length,
    synchronizationStatus: 'synchronized',
    continuity: {
      resumable: true,
      reconnectSupported: true,
      offlineRecoverySupported: true
    }
  };
}

function buildSessionMetadata(source = {}, participants = [], languageResolution = {}) {
  const timelineEntries = asArray(source.timeline?.clips || source.timeline?.events || source.timeline?.timelineSteps);

  return {
    voiceSessionMetadata: {
      sessionId: safeString(source.lessonGraph?.lessonId || source.timeline?.timelineId || `voice-session-${Date.now()}`) || `voice-session-${Date.now()}`,
      mode: 'metadata-only',
      language: languageResolution.selectedLanguage,
      turnCountHint: Math.max(1, participants.length * 4)
    },
    classroomSessionMetadata: {
      classroomMode: participants.length <= 2 ? 'one-to-one' : participants.length <= 12 ? 'seminar' : 'large-session',
      participantCount: participants.length,
      timelineEntryCount: timelineEntries.length,
      supportsPeerLearning: true,
      supportsStudentGroups: true
    },
    participationMetadata: {
      participantRoles: participants.map((participant) => ({
        participantId: participant.participantId,
        role: participant.role
      })),
      balancedParticipationTarget: participants.length > 1
    }
  };
}

function buildSessionRecoveryMetadata(adaptive = {}, state = {}) {
  return {
    interrupted: state.recovery?.interrupted === true,
    disconnected: state.recovery?.disconnected === true,
    offline: state.recovery?.offline === true,
    checkpointId: safeString(state.recovery?.checkpointId || '') || null,
    resumeCount: Math.max(0, toFiniteNumber(state.recovery?.resumeCount, 0)),
    resumeTimeMs: Math.max(0, toFiniteNumber(state.recovery?.resumeTimeMs, 0)),
    continuationMode: adaptive.conversationMode,
    contextRestoration: {
      enabled: true,
      conversationHistoryRestored: true,
      participantSynchronizationRestored: true
    }
  };
}

function buildRuntimeGraphEvents(payload = {}, options = {}) {
  const events = [];

  function push(eventType, channel, eventPayload) {
    if (events.length >= options.maxEvents) return;
    events.push({
      eventId: `runtime-graph-event-${events.length + 1}`,
      eventType,
      channel,
      timestampMs: Date.now(),
      payload: eventPayload
    });
  }

  push('voice-conversation-graph', 'runtime-graph.voice.conversation-graph', payload.conversationGraph);
  push('voice-conversation-state', 'runtime-graph.voice.conversation-state', payload.conversationState);
  push('voice-turn-metadata', 'runtime-graph.voice.turn-metadata', payload.turnMetadata);
  push('voice-session-metadata', 'runtime-graph.voice.session-metadata', payload.voiceSessionMetadata);
  push('classroom-session-metadata', 'runtime-graph.voice.classroom-session-metadata', payload.classroomSessionMetadata);
  push('participation-metadata', 'runtime-graph.voice.participation-metadata', payload.participationMetadata);
  push('speaking-queue', 'runtime-graph.voice.speaking-queue', payload.speakingQueue);
  push('discussion-events', 'runtime-graph.voice.discussion-events', payload.discussionEvents);
  push('question-events', 'runtime-graph.voice.question-events', payload.questionEvents);
  push('answer-events', 'runtime-graph.voice.answer-events', payload.answerEvents);
  push('clarification-events', 'runtime-graph.voice.clarification-events', payload.clarificationEvents);
  push('tutor-guidance-events', 'runtime-graph.voice.tutor-guidance-events', payload.tutorGuidanceEvents);
  push('collaboration-events', 'runtime-graph.voice.collaboration-events', payload.collaborationEvents);
  push('session-recovery-metadata', 'runtime-graph.voice.session-recovery-metadata', payload.sessionRecoveryMetadata);

  return events;
}

function buildOutput(runtime = {}, input = {}, state = createDefaultState(), options = {}) {
  const source = resolveInput(runtime, input);
  const runtimeGraphSummary = inferRuntimeGraphSummary(source.runtimeGraph);
  const languageResolution = resolveLanguages(source, options);
  const conversationTypeResolution = resolveConversationTypes(source);
  const capabilityResolution = resolveConversationCapabilities(source);
  const adaptiveConversation = computeAdaptiveConversation(source);

  const participants = buildParticipants(source, options);
  const conversationGraph = buildConversationGraph(source, participants);
  const turnMetadata = buildTurnMetadata(participants, adaptiveConversation, options);
  const speakingQueue = buildSpeakingQueue(participants, options);

  const discussionEvents = buildEventList('discussion', 'discussion-event', turnMetadata, options.maxEvents);
  const questionEvents = buildEventList('question', 'question-event', turnMetadata.filter((turn) => turn.intent === 'ask'), options.maxEvents);
  const answerEvents = buildEventList('answer', 'answer-event', turnMetadata.filter((turn) => turn.intent === 'answer'), options.maxEvents);
  const clarificationEvents = buildEventList('clarification', 'clarification-event', turnMetadata.filter((turn) => turn.intent === 'clarify'), options.maxEvents);
  const tutorGuidanceEvents = buildEventList('guidance', 'tutor-guidance-event', turnMetadata.filter((turn) => turn.intent === 'coach' || turn.intent === 'summarize'), options.maxEvents);
  const collaborationEvents = buildEventList('collaboration', 'collaboration-event', turnMetadata.filter((turn, index) => index % 2 === 0), options.maxEvents);

  const sessionMeta = buildSessionMetadata(source, participants, languageResolution);
  const conversationState = buildConversationState(source, participants, adaptiveConversation, runtimeGraphSummary);
  const sessionRecoveryMetadata = buildSessionRecoveryMetadata(adaptiveConversation, state);

  const outputBase = {
    schemaVersion: UNIVERSAL_AI_VOICE_CONVERSATION_SCHEMA_VERSION,
    conversationSessionId: sessionMeta.voiceSessionMetadata.sessionId,
    lessonId: safeString(source.lessonGraph?.lessonId || 'runtime-lesson') || 'runtime-lesson',
    language: languageResolution.selectedLanguage,
    supportedLanguages: languageResolution.supportedLanguages,
    communicationContract: {
      mode: 'runtime-graph-events-only',
      namespace: 'runtime-graph.voice'
    },
    conversationTypes: conversationTypeResolution,
    conversationCapabilities: capabilityResolution,
    adaptiveConversation,
    participants,
    conversationGraph,
    conversationState,
    turnMetadata,
    voiceSessionMetadata: sessionMeta.voiceSessionMetadata,
    classroomSessionMetadata: sessionMeta.classroomSessionMetadata,
    participationMetadata: sessionMeta.participationMetadata,
    speakingQueue,
    discussionEvents,
    questionEvents,
    answerEvents,
    clarificationEvents,
    tutorGuidanceEvents,
    collaborationEvents,
    sessionRecoveryMetadata,
    futureConversationModalities: uniqueStrings([
      ...asArray(source.futureModalities),
      ...asArray(source.pipeline?.futureConversationModalities)
    ], 260),
    diagnostics: {
      generatedAt: Date.now(),
      adaptationMode: adaptiveConversation.conversationMode,
      runtimeGraphNodeCount: runtimeGraphSummary.nodeCount,
      runtimeGraphRelationshipCount: runtimeGraphSummary.relationshipCount,
      unknownConversationTypeCount: conversationTypeResolution.unknownFutureConversationTypes.length,
      unknownCapabilityCount: capabilityResolution.unknownConversationCapabilities.length
    },
    synchronization: {
      integration: {
        universalLearningPipeline: { status: 'integrated', hasPipeline: isObject(source.pipeline) },
        lessonGenerator: { status: 'integrated', hasLessonGraph: isObject(source.lessonGraph) },
        aiTeacher: { status: 'integrated', eventCount: asArray(source.aiTeacherEvents).length },
        runtimeGraph: { status: 'integrated', nodeCount: runtimeGraphSummary.nodeCount, relationshipCount: runtimeGraphSummary.relationshipCount },
        timelineEngine: { status: 'integrated', eventCount: asArray(source.timeline?.clips || source.timeline?.events || source.timeline?.timelineSteps).length },
        knowledgeGraph: { status: 'integrated', nodeCount: asArray(source.knowledgeGraph?.nodes).length },
        assessmentEngine: { status: 'integrated', hasAssessment: Boolean(source.assessmentResults?.output || source.assessmentResults?.questionBank) },
        learningAnalytics: { status: 'integrated', hasAnalytics: Boolean(source.learningAnalytics?.output || source.learningAnalytics?.masteryScore) },
        personalizationEngine: { status: 'integrated', hasPersonalization: Boolean(source.personalization?.output || source.personalization?.runtimeState) },
        interactionEngine: { status: 'integrated', eventCount: asArray(source.interactionEvents).length }
      },
      versionCompatibility: {
        schemaVersion: UNIVERSAL_AI_VOICE_CONVERSATION_SCHEMA_VERSION,
        backwardCompatible: true,
        forwardCompatible: true
      }
    }
  };

  return {
    ...outputBase,
    runtimeGraphEvents: buildRuntimeGraphEvents(outputBase, options)
  };
}

export function validateUniversalAIVoiceConversationOutput(output = {}) {
  const source = isObject(output) ? output : {};
  const errors = [];
  const warnings = [];

  if (!safeString(source.conversationSessionId)) errors.push('Missing conversationSessionId.');
  if (!safeString(source.lessonId)) errors.push('Missing lessonId.');

  if (!isObject(source.communicationContract) || safeString(source.communicationContract.mode) !== 'runtime-graph-events-only') {
    errors.push('communicationContract.mode must be runtime-graph-events-only.');
  }

  [
    'conversationTypes',
    'conversationCapabilities',
    'adaptiveConversation',
    'conversationGraph',
    'conversationState',
    'voiceSessionMetadata',
    'classroomSessionMetadata',
    'participationMetadata',
    'sessionRecoveryMetadata',
    'diagnostics',
    'synchronization'
  ].forEach((field) => {
    if (!isObject(source[field])) {
      errors.push(`${field} must be an object.`);
    }
  });

  [
    'participants',
    'turnMetadata',
    'supportedLanguages',
    'speakingQueue',
    'discussionEvents',
    'questionEvents',
    'answerEvents',
    'clarificationEvents',
    'tutorGuidanceEvents',
    'collaborationEvents',
    'runtimeGraphEvents'
  ].forEach((field) => {
    if (!Array.isArray(source[field])) {
      errors.push(`${field} must be an array.`);
    }
  });

  const requiredEventTypes = [
    'voice-conversation-graph',
    'voice-conversation-state',
    'voice-turn-metadata',
    'voice-session-metadata',
    'classroom-session-metadata',
    'participation-metadata',
    'speaking-queue',
    'discussion-events',
    'question-events',
    'answer-events',
    'clarification-events',
    'tutor-guidance-events',
    'collaboration-events',
    'session-recovery-metadata'
  ];
  const foundEventTypes = new Set(asArray(source.runtimeGraphEvents).map((event) => safeString(event?.eventType)));
  requiredEventTypes.forEach((eventType) => {
    if (!foundEventTypes.has(eventType)) {
      errors.push(`Missing runtime graph event ${eventType}.`);
    }
  });

  const serialized = JSON.stringify(source);
  if (/speech-to-text|text-to-speech|webrtc|video-stream|audio-processing|three\.|renderer|webgl/i.test(serialized)) {
    errors.push('Forbidden transport/renderer payload detected.');
  }

  if (asArray(source?.conversationTypes?.unknownFutureConversationTypes).length > 0) {
    warnings.push('Unknown future conversation types were preserved automatically.');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    status: errors.length === 0 ? (warnings.length ? 'warning' : 'valid') : 'invalid'
  };
}

export function serializeUniversalAIVoiceConversationOutput(output = {}) {
  return JSON.stringify({
    schemaVersion: UNIVERSAL_AI_VOICE_CONVERSATION_SCHEMA_VERSION,
    serializedAt: Date.now(),
    output
  });
}

export function migrateUniversalAIVoiceConversationOutput(input = {}) {
  const source = isObject(input) ? input : {};

  if (safeString(source.schemaVersion) === UNIVERSAL_AI_VOICE_CONVERSATION_SCHEMA_VERSION && Array.isArray(source.runtimeGraphEvents)) {
    return source;
  }

  const lessonId = safeString(source.lessonId || source.id || 'legacy-lesson') || 'legacy-lesson';
  const migrated = buildOutput({}, {
    lessonGraph: {
      lessonId,
      title: safeString(source.title || 'Recovered Conversation Session') || 'Recovered Conversation Session',
      language: safeString(source.language || 'English') || 'English',
      topics: asArray(source.topics)
    },
    conversationTypes: asArray(source.conversationTypes),
    participants: asArray(source.participants)
  }, createDefaultState(), DEFAULT_UNIVERSAL_AI_VOICE_CONVERSATION_CONFIG);

  return {
    ...migrated,
    diagnostics: {
      ...migrated.diagnostics,
      migratedFromSchema: safeString(source.schemaVersion || 'legacy') || 'legacy'
    }
  };
}

export function deserializeUniversalAIVoiceConversationOutput(payload = '') {
  const parsed = parsePayload(payload);
  if (!parsed) {
    const fallback = migrateUniversalAIVoiceConversationOutput({
      lessonId: 'recovered-lesson',
      title: 'Recovered Conversation Session'
    });

    return {
      output: fallback,
      validation: {
        valid: false,
        status: 'fallback',
        errors: ['Failed to parse voice conversation payload.'],
        warnings: []
      }
    };
  }

  const output = migrateUniversalAIVoiceConversationOutput(parsed.output || parsed);
  return {
    output,
    validation: validateUniversalAIVoiceConversationOutput(output)
  };
}

export class UniversalAIVoiceConversationLiveClassroomEngine {
  constructor(runtime = {}, options = {}) {
    this.runtime = runtime;
    this.options = {
      ...DEFAULT_UNIVERSAL_AI_VOICE_CONVERSATION_CONFIG,
      ...(isObject(options) ? options : {})
    };

    this.persistenceAdapter = this.options.persistenceAdapter || createDefaultPersistenceAdapter();
    this.persistenceKey = safeString(this.options.persistenceKey || DEFAULT_UNIVERSAL_AI_VOICE_CONVERSATION_CONFIG.persistenceKey)
      || DEFAULT_UNIVERSAL_AI_VOICE_CONVERSATION_CONFIG.persistenceKey;

    this.state = createDefaultState();
    this.recoverSession();
  }

  generate(input = {}) {
    const startedAt = Date.now();
    const output = buildOutput(this.runtime, input, this.state, this.options);
    const validation = validateUniversalAIVoiceConversationOutput(output);

    this.state.output = output;
    this.state.status = validation.valid ? 'Ready' : 'Warning';
    this.state.diagnostics.runs += 1;
    this.state.diagnostics.latestDurationMs = Math.max(0, Date.now() - startedAt);
    this.state.diagnostics.warnings = [...this.state.diagnostics.warnings, ...validation.warnings].slice(-this.options.maxHistory);

    pushHistory(this.state, {
      type: 'voice-conversation-generated',
      sessionId: output.conversationSessionId,
      at: Date.now(),
      valid: validation.valid
    }, this.options.maxHistory, 'runtimeEvents');

    this.state.history.conversationTurns = asArray(output.turnMetadata).slice(-this.options.maxTurns);
    this.state.participantSync = {
      version: Math.max(1, toFiniteNumber(this.state.participantSync?.version, 0) + 1),
      participants: asArray(output.participants)
    };

    this.runtime.metadata = {
      ...(this.runtime.metadata || {}),
      voiceConversationAdapter: {
        output,
        validation,
        runtimeState: this.snapshot()
      }
    };

    this.persistSession();

    return {
      output,
      validation,
      diagnostics: {
        durationMs: this.state.diagnostics.latestDurationMs,
        generatedAt: Date.now(),
        mode: output?.adaptiveConversation?.conversationMode || 'balanced-coaching'
      }
    };
  }

  synchronize(reason = 'manual', input = {}) {
    const result = this.generate(input);
    pushHistory(this.state, {
      type: 'voice-conversation-synchronized',
      reason: safeString(reason) || 'manual',
      at: Date.now()
    }, this.options.maxHistory, 'runtimeEvents');

    return {
      ...this.snapshot(),
      lastSynchronizationReason: safeString(reason) || 'manual',
      result
    };
  }

  markInterrupted(reason = 'interrupted') {
    this.state.recovery.interrupted = true;
    this.state.status = 'Paused';
    pushHistory(this.state, {
      type: 'conversation-interrupted',
      reason: safeString(reason) || 'interrupted',
      at: Date.now()
    }, this.options.maxHistory, 'runtimeEvents');
    this.persistSession();
    return true;
  }

  markDisconnected(reason = 'disconnected') {
    this.state.recovery.disconnected = true;
    pushHistory(this.state, {
      type: 'conversation-disconnected',
      reason: safeString(reason) || 'disconnected',
      at: Date.now()
    }, this.options.maxHistory, 'runtimeEvents');
    this.persistSession();
    return true;
  }

  markOffline(reason = 'offline') {
    this.state.recovery.offline = true;
    pushHistory(this.state, {
      type: 'conversation-offline',
      reason: safeString(reason) || 'offline',
      at: Date.now()
    }, this.options.maxHistory, 'runtimeEvents');
    this.persistSession();
    return true;
  }

  resumeFromCheckpoint(checkpointId = null) {
    const resolvedCheckpoint = safeString(checkpointId || this.state.recovery.checkpointId || '') || null;
    this.state.recovery.checkpointId = resolvedCheckpoint;
    this.state.recovery.interrupted = false;
    this.state.recovery.disconnected = false;
    this.state.recovery.offline = false;
    this.state.recovery.resumeCount += 1;
    this.state.status = 'Ready';

    return this.synchronize('resume-from-checkpoint', {
      interactionEvents: asArray(this.runtime?.sceneEventRuntime?.events)
    });
  }

  handleExternalTimelineMutation(mutationType = 'manual', context = {}) {
    const safeType = safeString(mutationType || 'manual') || 'manual';

    if (safeType.includes('pause')) {
      this.state.recovery.interrupted = true;
      this.state.status = 'Paused';
    }

    if (safeType.includes('resume') || safeType.includes('recover') || safeType.includes('reconnect')) {
      this.state.recovery.interrupted = false;
      this.state.recovery.disconnected = false;
      this.state.recovery.offline = false;
      this.state.recovery.resumeCount += 1;
      this.state.status = 'Ready';
    }

    this.state.recovery.resumeTimeMs = Math.max(0, toFiniteNumber(this.runtime?.timelineScheduler?.snapshot?.()?.clock?.timeMs, this.state.recovery.resumeTimeMs));

    pushHistory(this.state, {
      type: 'timeline-mutation',
      mutationType: safeType,
      context,
      at: Date.now()
    }, this.options.maxHistory, 'runtimeEvents');

    return this.synchronize(`mutation:${safeType}`, {
      interactionEvents: asArray(this.runtime?.sceneEventRuntime?.events)
    });
  }

  persistSession(adapter = this.persistenceAdapter) {
    if (!adapter) return false;

    const payload = JSON.stringify({
      schemaVersion: UNIVERSAL_AI_VOICE_CONVERSATION_SCHEMA_VERSION,
      persistedAt: Date.now(),
      state: this.state
    });

    if (typeof adapter.setItem === 'function') {
      adapter.setItem(this.persistenceKey, payload);
    } else if (typeof adapter.save === 'function') {
      adapter.save(this.persistenceKey, payload);
    } else {
      return false;
    }

    this.state.diagnostics.persistedSessions += 1;
    return true;
  }

  recoverSession(adapter = this.persistenceAdapter) {
    if (!adapter) return false;

    let raw = null;
    if (typeof adapter.getItem === 'function') {
      raw = adapter.getItem(this.persistenceKey);
    } else if (typeof adapter.load === 'function') {
      raw = adapter.load(this.persistenceKey);
    }

    if (!raw) return false;

    const parsed = parsePayload(raw);
    if (!parsed || !isObject(parsed.state)) return false;

    const source = parsed.state;
    this.state = {
      ...createDefaultState(),
      ...source,
      diagnostics: {
        ...createDefaultState().diagnostics,
        ...(isObject(source.diagnostics) ? source.diagnostics : {}),
        recoveries: Math.max(0, toFiniteNumber(source?.diagnostics?.recoveries, 0)) + 1
      },
      recovery: {
        ...createDefaultState().recovery,
        ...(isObject(source.recovery) ? source.recovery : {})
      },
      history: {
        conversationTurns: asArray(source?.history?.conversationTurns).slice(-this.options.maxTurns),
        runtimeEvents: asArray(source?.history?.runtimeEvents).slice(-this.options.maxHistory)
      },
      participantSync: {
        version: Math.max(0, toFiniteNumber(source?.participantSync?.version, 0)),
        participants: asArray(source?.participantSync?.participants)
      }
    };

    return true;
  }

  snapshot() {
    return parsePayload(JSON.stringify(this.state)) || createDefaultState();
  }

  destroy() {
    this.persistSession();
    return this.snapshot();
  }

  static supportedChannels() {
    return [
      'voice-conversation-generated',
      'voice-conversation-synchronized',
      'voice-conversation-persisted',
      'voice-conversation-recovered',
      'voice-conversation-destroyed'
    ];
  }
}

export function createUniversalAIVoiceConversationLiveClassroomEngine(runtime = {}, options = {}) {
  return new UniversalAIVoiceConversationLiveClassroomEngine(runtime, options);
}

export function runUniversalAIVoiceConversationLiveClassroomEngine(input = {}, options = {}) {
  const runtime = isObject(options.runtime) ? options.runtime : {};
  const normalizedOptions = {
    ...options
  };
  delete normalizedOptions.runtime;

  const engine = createUniversalAIVoiceConversationLiveClassroomEngine(runtime, normalizedOptions);
  return engine.generate(input);
}
