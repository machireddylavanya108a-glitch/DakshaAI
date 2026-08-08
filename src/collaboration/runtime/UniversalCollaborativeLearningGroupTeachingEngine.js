import {
  UNIVERSAL_COLLABORATIVE_LEARNING_SCHEMA_VERSION,
  SUPPORTED_BASE_COLLABORATION_MODELS,
  SUPPORTED_BASE_COLLABORATION_CAPABILITIES,
  DEFAULT_UNIVERSAL_COLLABORATIVE_LEARNING_CONFIG,
  isObject,
  asArray,
  safeString,
  toFiniteNumber,
  clamp,
  uniqueStrings,
  normalizeCollaborationModel,
  normalizeParticipantType,
  normalizeCapability
} from './UniversalCollaborativeLearningGroupTeachingEngineConfig.js';

const STORE_KEY = '__daksha_universal_collaborative_learning_engine_store__';

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
    schemaVersion: UNIVERSAL_COLLABORATIVE_LEARNING_SCHEMA_VERSION,
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
      recentEvents: [],
      collaborationTimeline: []
    },
    participantSync: {
      version: 0,
      participants: []
    }
  };
}

function pushHistory(state = {}, entry = {}, maxHistory = 1800, bucket = 'recentEvents') {
  const history = isObject(state.history) ? state.history : { recentEvents: [], collaborationTimeline: [] };
  const items = asArray(history[bucket]);
  items.push(entry);
  while (items.length > maxHistory) {
    items.shift();
  }
  history[bucket] = items;
  state.history = history;
}

function resolveInput(runtime = {}, input = {}) {
  return {
    runtimeGraph: isObject(input.runtimeGraph) ? input.runtimeGraph : runtime?.graph || {},
    lessonGraph: isObject(input.lessonGraph) ? input.lessonGraph : runtime?.metadata?.lessonGraph || {},
    curriculumGraph: isObject(input.curriculumGraph) ? input.curriculumGraph : runtime?.metadata?.curriculumAuthoringAdapter?.output || {},
    timeline: isObject(input.timeline) ? input.timeline : runtime?.metadata?.timeline || runtime?.metadata?.timelineData || {},
    aiTeacherEvents: asArray(input.aiTeacherEvents).length ? asArray(input.aiTeacherEvents) : asArray(runtime?.metadata?.aiTeacherAdapter?.runtimeState?.history?.recentEvents),
    learningAnalytics: isObject(input.learningAnalytics) ? input.learningAnalytics : runtime?.metadata?.learningAnalyticsAdapter || {},
    assessmentResults: isObject(input.assessmentResults) ? input.assessmentResults : runtime?.metadata?.assessmentAdapter || {},
    knowledgeGraph: isObject(input.knowledgeGraph) ? input.knowledgeGraph : runtime?.metadata?.knowledgeMemoryAdapter?.output?.knowledgeGraph || {},
    userProfiles: asArray(input.userProfiles).length ? asArray(input.userProfiles) : asArray(runtime?.metadata?.collaborationParticipants || runtime?.metadata?.userProfiles),
    personalization: isObject(input.personalization) ? input.personalization : runtime?.metadata?.personalizationAdaptiveAdapter || {},
    sessionState: isObject(input.sessionState) ? input.sessionState : runtime?.metadata?.sessionState || {},
    collaborationEvents: asArray(input.collaborationEvents).length ? asArray(input.collaborationEvents) : asArray(runtime?.sceneEventRuntime?.events),
    learningIntent: isObject(input.learningIntent) ? input.learningIntent : runtime?.metadata?.intentProfile || runtime?.metadata?.learningIntent || {},
    pipeline: isObject(input.pipeline) ? input.pipeline : runtime?.metadata?.pipeline || runtime?.metadata?.sourceMeta || {},
    collaborationModels: asArray(input.collaborationModels),
    participantTypes: asArray(input.participantTypes),
    capabilities: asArray(input.capabilities),
    preferredLanguages: asArray(input.preferredLanguages),
    futureModalities: asArray(input.futureModalities),
    sessionId: safeString(input.sessionId || runtime?.metadata?.sessionId || ''),
    classroomName: safeString(input.classroomName || runtime?.metadata?.classroomName || 'Universal Collaboration Session')
  };
}

function resolveLanguages(source = {}, options = {}) {
  const selectedLanguage = safeString(
    source.userProfiles?.[0]?.preferredLanguage
    || source.userProfiles?.[0]?.language
    || source.lessonGraph?.language
    || source.learningIntent?.language
    || options.defaultLanguage
    || 'English'
  ) || 'English';

  const supportedLanguages = uniqueStrings([
    ...asArray(source.preferredLanguages),
    ...asArray(source.userProfiles).flatMap((profile) => [profile?.preferredLanguage, profile?.language, ...(profile?.supportedLanguages || [])]),
    ...asArray(source.pipeline?.supportedLanguages),
    selectedLanguage
  ], 120);

  return {
    selectedLanguage,
    supportedLanguages
  };
}

function resolveCollaborationModels(source = {}) {
  const requested = uniqueStrings([
    ...asArray(source.collaborationModels),
    ...asArray(source.lessonGraph?.collaborationModels),
    ...asArray(source.learningIntent?.collaborationModels),
    ...SUPPORTED_BASE_COLLABORATION_MODELS
  ], 420);

  const normalized = requested.map((item) => normalizeCollaborationModel(item));
  return {
    activeCollaborationModels: uniqueStrings(normalized.map((item) => item.collaborationModel), 420),
    unknownFutureCollaborationModels: uniqueStrings(normalized.filter((item) => !item.known).map((item) => item.collaborationModel), 260)
  };
}

function resolveParticipantTypes(source = {}) {
  const requested = uniqueStrings([
    ...asArray(source.participantTypes),
    ...asArray(source.userProfiles).map((profile) => profile?.role || profile?.participantType),
    ...asArray(source.collaborationEvents).map((event) => event?.participantType || event?.role),
    'teacher', 'learner', 'mentor', 'ai-tutor'
  ], 420);

  const normalized = requested.map((item) => normalizeParticipantType(item));
  return {
    activeParticipantTypes: uniqueStrings(normalized.map((item) => item.participantType), 420),
    unknownFutureParticipantTypes: uniqueStrings(normalized.filter((item) => !item.known).map((item) => item.participantType), 260)
  };
}

function resolveCapabilities(source = {}) {
  const requested = uniqueStrings([
    ...asArray(source.capabilities),
    ...asArray(source.learningIntent?.collaborationCapabilities),
    ...asArray(source.pipeline?.collaborationCapabilities),
    ...SUPPORTED_BASE_COLLABORATION_CAPABILITIES
  ], 420);

  const normalized = requested.map((item) => normalizeCapability(item));
  return {
    enabledCapabilities: uniqueStrings(normalized.map((item) => item.capability), 420),
    unknownCapabilities: uniqueStrings(normalized.filter((item) => !item.known).map((item) => item.capability), 260)
  };
}

function buildParticipants(source = {}, options = {}) {
  const profiles = asArray(source.userProfiles).length ? asArray(source.userProfiles) : [{
    id: 'participant-1',
    role: 'learner',
    participantType: 'learner',
    displayName: 'Learner 1',
    preferredLanguage: source.lessonGraph?.language || 'English'
  }];

  return profiles.slice(0, options.maxParticipants || 500).map((profile, index) => {
    const participantType = safeString(profile?.participantType || profile?.role || 'learner') || 'learner';
    const normalized = normalizeParticipantType(participantType);

    return {
      participantId: safeString(profile?.participantId || profile?.id || `participant-${index + 1}`) || `participant-${index + 1}`,
      role: safeString(profile?.role || normalized.participantType || 'learner') || 'learner',
      participantType: normalized.participantType,
      displayName: safeString(profile?.displayName || profile?.name || `Participant ${index + 1}`) || `Participant ${index + 1}`,
      language: safeString(profile?.preferredLanguage || profile?.language || source.lessonGraph?.language || 'English') || 'English',
      level: safeString(profile?.level || profile?.learningLevel || 'intermediate') || 'intermediate',
      syncVersion: Math.max(1, toFiniteNumber(profile?.syncVersion || profile?.version || 1, 1)),
      permissions: asArray(profile?.permissions || profile?.capabilities).length ? asArray(profile?.permissions || profile?.capabilities) : ['collaborate'],
      status: safeString(profile?.status || 'active') || 'active'
    };
  });
}

function buildParticipationSignals(source = {}) {
  const analyticsOutput = isObject(source.learningAnalytics?.output) ? source.learningAnalytics.output : source.learningAnalytics;
  const assessmentOutput = isObject(source.assessmentResults?.output) ? source.assessmentResults.output : source.assessmentResults;
  const confidence = clamp(assessmentOutput?.learningConfidence ?? analyticsOutput?.learningConfidence ?? 0.62, 0, 1);
  const mastery = clamp(assessmentOutput?.masteryScore ?? analyticsOutput?.masteryScore ?? 0.6, 0, 1);
  const participationScore = clamp((confidence + mastery) / 2, 0, 1);
  const engagement = clamp(toFiniteNumber(source.sessionState?.engagementScore ?? analyticsOutput?.engagementScore ?? 0.6, 0.6), 0, 1);
  const contribution = clamp(toFiniteNumber(source.sessionState?.contributionScore ?? analyticsOutput?.contributionScore ?? 0.65, 0.65), 0, 1);

  return {
    participationScore,
    collaborationScore: clamp((participationScore + engagement + contribution) / 3, 0, 1),
    teamworkScore: clamp((engagement + contribution) / 2, 0, 1),
    contributionScore: contribution,
    engagementScore: engagement,
    confidence,
    mastery,
    futureSignals: isObject(source.personalization?.output?.futureSignals) ? source.personalization.output.futureSignals : {}
  };
}

function buildCollaborationGraph(participants = [], runtimeGraphSummary = {}) {
  const nodes = participants.map((participant, index) => ({
    id: `participant:${participant.participantId}`,
    label: participant.displayName,
    kind: 'participant',
    metadata: {
      role: participant.role,
      participantType: participant.participantType,
      language: participant.language,
      status: participant.status
    }
  }));

  const edges = participants.slice(1).map((participant, index) => ({
    id: `relationship:${participants[index].participantId}-${participant.participantId}`,
    from: `participant:${participants[index].participantId}`,
    to: `participant:${participant.participantId}`,
    relation: 'collaborates-with',
    metadata: {
      strength: 0.5 + (index / Math.max(1, participants.length))
    }
  }));

  return {
    nodes,
    edges,
    metadata: {
      schemaVersion: UNIVERSAL_COLLABORATIVE_LEARNING_SCHEMA_VERSION,
      participantCount: participants.length,
      runtimeGraphNodeCount: runtimeGraphSummary.nodeCount,
      runtimeGraphRelationshipCount: runtimeGraphSummary.relationshipCount
    }
  };
}

function buildClassroomMetadata(source = {}, participants = [], language = 'English') {
  const classSize = participants.length;
  const sessionId = safeString(source.sessionId || source.lessonGraph?.lessonId || source.timeline?.sessionId || `collab-${Date.now()}`) || `collab-${Date.now()}`;

  return {
    sessionId,
    classroomName: safeString(source.classroomName || source.lessonGraph?.title || 'Universal Collaboration Session') || 'Universal Collaboration Session',
    mode: classSize <= 2 ? 'pair' : classSize <= 12 ? 'small-group' : classSize <= 40 ? 'classroom' : 'large-classroom',
    participantCount: classSize,
    language,
    supportsMultilingual: true,
    supportsOfflineSync: true,
    supportsMultiDeviceSync: true,
    supportsRecovery: true,
    supportsFutureParticipantTypes: true
  };
}

function buildGroupMetadata(participants = [], source = {}) {
  return {
    groupId: safeString(source.sessionId || source.lessonGraph?.lessonId || 'group-session') || 'group-session',
    groupName: safeString(source.classroomName || source.lessonGraph?.title || 'Group Learning Session') || 'Group Learning Session',
    leaderId: participants.find((p) => p.role === 'teacher' || p.participantType === 'teacher' || p.participantType === 'ai-tutor')?.participantId || participants[0]?.participantId || null,
    moderatorIds: participants.filter((p) => p.role === 'moderator' || p.participantType === 'moderator').map((p) => p.participantId),
    teamSize: participants.length,
    collaborationMode: 'metadata-driven'
  };
}

function buildTeamMetadata(participants = [], source = {}) {
  return {
    teamId: safeString(source.sessionId || source.lessonGraph?.lessonId || 'team-session') || 'team-session',
    teamName: safeString(source.classroomName || source.lessonGraph?.title || 'Team Learning Session') || 'Team Learning Session',
    roles: participants.map(({ participantId, role, participantType }) => ({ participantId, role, participantType })),
    permissions: buildPermissions(participants),
    objectiveSummary: safeString(source.lessonGraph?.title || source.curriculumGraph?.title || 'Collaborative learning objective') || 'Collaborative learning objective'
  };
}

function buildPermissions(participants = []) {
  return participants.map((participant) => ({
    participantId: participant.participantId,
    permissions: uniqueStrings([
      'collaborate',
      'share-progress',
      'evaluate',
      ...asArray(participant.permissions),
      ...(participant.role === 'teacher' || participant.participantType === 'teacher' || participant.participantType === 'ai-tutor' ? ['moderate', 'assign', 'mentor'] : []),
      ...(participant.role === 'student' || participant.participantType === 'learner' ? ['discuss', 'review', 'vote'] : [])
    ], 80)
  }));
}

function buildSharedLearningState(source = {}, signals = {}, participants = []) {
  return {
    phase: signals.collaborationScore > 0.8 ? 'high-collaboration' : signals.participationScore > 0.6 ? 'active-participation' : 'stabilizing',
    synchronizedAt: Date.now(),
    learningObjectives: uniqueStrings([
      ...asArray(source.lessonGraph?.learningObjectives),
      ...asArray(source.curriculumGraph?.learningObjectives),
      ...asArray(source.lessonGraph?.keyConcepts),
      ...asArray(source.knowledgeGraph?.nodes).map((node) => node?.label || node?.id)
    ], 200),
    progressByParticipant: participants.map((participant) => ({
      participantId: participant.participantId,
      progress: clamp((signals.participationScore + signals.engagementScore + signals.confidence) / 3, 0, 1),
      status: participant.status || 'active'
    })),
    synchronizationStatus: 'synchronized',
    recoveryStatus: 'ready'
  };
}

function buildDiscussionEvents(participants = [], signals = {}, options = {}) {
  return participants.slice(0, Math.min(participants.length, 10)).map((participant, index) => ({
    eventId: `discussion-${index + 1}`,
    eventType: 'discussion-event',
    participantId: participant.participantId,
    role: participant.role,
    timestampMs: Date.now() + index * 250,
    payload: {
      action: 'discuss',
      topic: 'collaborative-learning',
      score: clamp(signals.engagementScore + (index + 1) / 100, 0, 1),
      language: participant.language
    }
  })).slice(0, options.maxEvents || 2000);
}

function buildQuestionEvents(participants = [], options = {}) {
  return participants.slice(0, Math.min(participants.length, 10)).map((participant, index) => ({
    eventId: `question-${index + 1}`,
    eventType: 'question-event',
    participantId: participant.participantId,
    role: participant.role,
    timestampMs: Date.now() + index * 300,
    payload: {
      action: 'ask',
      questionType: 'clarification',
      language: participant.language
    }
  })).slice(0, options.maxEvents || 2000);
}

function buildAnswerEvents(participants = []) {
  return participants.slice(0, Math.min(participants.length, 10)).map((participant, index) => ({
    eventId: `answer-${index + 1}`,
    eventType: 'answer-event',
    participantId: participant.participantId,
    role: participant.role,
    timestampMs: Date.now() + index * 350,
    payload: {
      action: 'answer',
      confidence: 0.6 + (index / 20),
      language: participant.language
    }
  }));
}

function buildReviewEvents(participants = [], signals = {}) {
  return participants.slice(0, Math.min(participants.length, 10)).map((participant, index) => ({
    eventId: `review-${index + 1}`,
    eventType: 'review-event',
    participantId: participant.participantId,
    role: participant.role,
    timestampMs: Date.now() + index * 400,
    payload: {
      action: 'review',
      score: clamp(signals.collaborationScore + index / 100, 0, 1),
      language: participant.language
    }
  }));
}

function buildFeedbackEvents(participants = [], signals = {}) {
  return participants.slice(0, Math.min(participants.length, 10)).map((participant, index) => ({
    eventId: `feedback-${index + 1}`,
    eventType: 'feedback-event',
    participantId: participant.participantId,
    role: participant.role,
    timestampMs: Date.now() + index * 450,
    payload: {
      action: 'feedback',
      improvementScore: clamp(signals.teamworkScore + index / 100, 0, 1),
      language: participant.language
    }
  }));
}

function buildAssignmentMetadata(source = {}, participants = []) {
  return {
    assignmentId: safeString(source.lessonGraph?.lessonId || 'assignment-1') || 'assignment-1',
    title: safeString(source.lessonGraph?.title || source.classroomName || 'Collaborative Assignment') || 'Collaborative Assignment',
    assignees: participants.map((participant) => participant.participantId),
    status: 'active',
    workflow: 'metadata-driven'
  };
}

function buildAnalytics(signals = {}, participants = []) {
  return {
    participationScore: clamp(signals.participationScore, 0, 1),
    collaborationScore: clamp(signals.collaborationScore, 0, 1),
    teamworkScore: clamp(signals.teamworkScore, 0, 1),
    contributionScore: clamp(signals.contributionScore, 0, 1),
    engagementScore: clamp(signals.engagementScore, 0, 1),
    participantCount: participants.length,
    recommendations: [
      signals.collaborationScore < 0.6 ? 'Increase balanced participation and clearer role ownership.' : 'Maintain shared progress visibility and role alignment.',
      signals.teamworkScore < 0.7 ? 'Create structured peer review and feedback loops.' : 'Continue coordinated task division and synchronized checkpoints.'
    ],
    groupImprovementPlan: {
      priorities: ['Balance participation', 'Clarify role ownership', 'Improve synchronized updates'],
      targetScore: 0.8
    },
    personalizedCollaborationSuggestions: participants.map((participant) => ({
      participantId: participant.participantId,
      suggestion: participant.role === 'teacher' || participant.participantType === 'teacher' || participant.participantType === 'ai-tutor'
        ? 'Set clearer facilitation checkpoints and equitable turn-taking.'
        : 'Share progress updates and contribute to peer review tasks.'
    }))
  };
}

function buildConflictResolutionMetadata(source = {}) {
  return {
    policy: 'metadata-driven-conflict-resolution',
    escalationPath: ['moderator', 'teacher', 'ai-moderator', 'system'],
    resolutionMode: 'consensus-or-fallback-roles',
    state: source.sessionState?.conflictState || 'stable',
    supportsFutureModels: true
  };
}

function buildRecoveryMetadata(state = {}) {
  return {
    interrupted: state.recovery?.interrupted === true,
    disconnected: state.recovery?.disconnected === true,
    offline: state.recovery?.offline === true,
    checkpointId: safeString(state.recovery?.checkpointId || '') || null,
    resumeCount: Math.max(0, toFiniteNumber(state.recovery?.resumeCount, 0)),
    resumeTimeMs: Math.max(0, toFiniteNumber(state.recovery?.resumeTimeMs, 0)),
    recoveryMode: 'session-and-collaboration-recovery',
    contextRestoration: {
      enabled: true,
      participantSyncRestored: true,
      discussionHistoryRestored: true,
      assignmentStateRestored: true
    }
  };
}

function buildRuntimeGraphEvents(payload = {}, options = {}) {
  const events = [];

  function push(eventType, channel, eventPayload) {
    if (events.length >= (options.maxEvents || 2000)) return;
    events.push({
      eventId: `runtime-graph-event-${events.length + 1}`,
      eventType,
      channel,
      timestampMs: Date.now(),
      payload: eventPayload
    });
  }

  push('collaboration-graph', 'runtime-graph.collaboration-graph', payload.collaborationGraph);
  push('classroom-metadata', 'runtime-graph.collaboration.classroom-metadata', payload.classroomMetadata);
  push('group-metadata', 'runtime-graph.collaboration.group-metadata', payload.groupMetadata);
  push('team-metadata', 'runtime-graph.collaboration.team-metadata', payload.teamMetadata);
  push('participant-metadata', 'runtime-graph.collaboration.participant-metadata', payload.participantMetadata);
  push('roles', 'runtime-graph.collaboration.roles', payload.roles);
  push('permissions', 'runtime-graph.collaboration.permissions', payload.permissions);
  push('shared-learning-state', 'runtime-graph.collaboration.shared-learning-state', payload.sharedLearningState);
  push('discussion-events', 'runtime-graph.collaboration.discussion-events', payload.discussionEvents);
  push('question-events', 'runtime-graph.collaboration.question-events', payload.questionEvents);
  push('answer-events', 'runtime-graph.collaboration.answer-events', payload.answerEvents);
  push('review-events', 'runtime-graph.collaboration.review-events', payload.reviewEvents);
  push('feedback-events', 'runtime-graph.collaboration.feedback-events', payload.feedbackEvents);
  push('assignment-metadata', 'runtime-graph.collaboration.assignment-metadata', payload.assignmentMetadata);
  push('collaboration-analytics', 'runtime-graph.collaboration.analytics', payload.collaborationAnalytics);
  push('participation-analytics', 'runtime-graph.collaboration.participation-analytics', payload.participationAnalytics);
  push('conflict-resolution-metadata', 'runtime-graph.collaboration.conflict-resolution', payload.conflictResolutionMetadata);
  push('session-recovery-metadata', 'runtime-graph.collaboration.session-recovery', payload.sessionRecoveryMetadata);

  return events;
}

function buildOutput(runtime = {}, input = {}, state = createDefaultState(), options = {}) {
  const source = resolveInput(runtime, input);
  const runtimeGraphSummary = inferRuntimeGraphSummary(source.runtimeGraph);
  const languageResolution = resolveLanguages(source, options);
  const collaborationModelResolution = resolveCollaborationModels(source);
  const participantTypeResolution = resolveParticipantTypes(source);
  const capabilityResolution = resolveCapabilities(source);
  const participants = buildParticipants(source, options);
  const signals = buildParticipationSignals(source);
  const classroomMetadata = buildClassroomMetadata(source, participants, languageResolution.selectedLanguage);
  const collaborationGraph = buildCollaborationGraph(participants, runtimeGraphSummary);
  const groupMetadata = buildGroupMetadata(participants, source);
  const teamMetadata = buildTeamMetadata(participants, source);

  const participantMetadata = participants.map((participant) => ({
    participantId: participant.participantId,
    displayName: participant.displayName,
    participantType: participant.participantType,
    role: participant.role,
    language: participant.language,
    permissions: asArray(participant.permissions),
    status: participant.status
  }));

  const roles = participants.map((participant) => ({
    participantId: participant.participantId,
    role: participant.role,
    participantType: participant.participantType,
    permissions: asArray(participant.permissions)
  }));

  const permissions = buildPermissions(participants);
  const sharedLearningState = buildSharedLearningState(source, signals, participants);
  const discussionEvents = buildDiscussionEvents(participants, signals, options);
  const questionEvents = buildQuestionEvents(participants, options);
  const answerEvents = buildAnswerEvents(participants);
  const reviewEvents = buildReviewEvents(participants, signals);
  const feedbackEvents = buildFeedbackEvents(participants, signals);
  const assignmentMetadata = buildAssignmentMetadata(source, participants);
  const collaborationAnalytics = buildAnalytics(signals, participants);
  const participationAnalytics = {
    totalParticipants: participants.length,
    activeParticipants: participants.filter((p) => p.status !== 'inactive').length,
    resolvedConflicts: 0,
    averageContribution: signals.contributionScore,
    averageEngagement: signals.engagementScore
  };
  const conflictResolutionMetadata = buildConflictResolutionMetadata(source);
  const sessionRecoveryMetadata = buildRecoveryMetadata(state);

  const outputBase = {
    schemaVersion: UNIVERSAL_COLLABORATIVE_LEARNING_SCHEMA_VERSION,
    sessionId: classroomMetadata.sessionId,
    lessonId: safeString(source.lessonGraph?.lessonId || 'collaboration-lesson') || 'collaboration-lesson',
    classroomName: classroomMetadata.classroomName,
    language: languageResolution.selectedLanguage,
    supportedLanguages: languageResolution.supportedLanguages,
    communicationContract: {
      mode: 'runtime-graph-events-only',
      namespace: 'runtime-graph.collaboration'
    },
    collaborationModels: collaborationModelResolution,
    participantTypes: participantTypeResolution,
    capabilities: capabilityResolution,
    collaborationGraph,
    classroomMetadata,
    groupMetadata,
    teamMetadata,
    participantMetadata,
    roles,
    permissions,
    sharedLearningState,
    discussionEvents,
    questionEvents,
    answerEvents,
    reviewEvents,
    feedbackEvents,
    assignmentMetadata,
    collaborationAnalytics,
    participationAnalytics,
    conflictResolutionMetadata,
    sessionRecoveryMetadata,
    futureCollaborationModalities: uniqueStrings([
      ...asArray(source.futureModalities),
      ...asArray(source.pipeline?.futureCollaborationModalities)
    ], 260),
    diagnostics: {
      generatedAt: Date.now(),
      runtimeGraphNodeCount: runtimeGraphSummary.nodeCount,
      runtimeGraphRelationshipCount: runtimeGraphSummary.relationshipCount,
      unknownCollaborationModelCount: collaborationModelResolution.unknownFutureCollaborationModels.length,
      unknownParticipantTypeCount: participantTypeResolution.unknownFutureParticipantTypes.length,
      unknownCapabilityCount: capabilityResolution.unknownCapabilities.length
    },
    synchronization: {
      integration: {
        universalLearningPipeline: { status: 'integrated', hasPipeline: isObject(source.pipeline) },
        lessonGenerator: { status: 'integrated', hasLessonGraph: isObject(source.lessonGraph) },
        curriculumEngine: { status: 'integrated', hasCurriculum: isObject(source.curriculumGraph) },
        aiTeacher: { status: 'integrated', eventCount: asArray(source.aiTeacherEvents).length },
        runtimeGraph: { status: 'integrated', nodeCount: runtimeGraphSummary.nodeCount, relationshipCount: runtimeGraphSummary.relationshipCount },
        timelineEngine: { status: 'integrated', eventCount: asArray(source.timeline?.clips || source.timeline?.events || source.timeline?.timelineSteps).length },
        knowledgeGraph: { status: 'integrated', nodeCount: asArray(source.knowledgeGraph?.nodes).length },
        assessmentEngine: { status: 'integrated', hasAssessment: Boolean(source.assessmentResults?.output || source.assessmentResults?.questionBank) },
        learningAnalytics: { status: 'integrated', hasAnalytics: Boolean(source.learningAnalytics?.output || source.learningAnalytics?.masteryScore) },
        personalizationEngine: { status: 'integrated', hasPersonalization: Boolean(source.personalization?.output || source.personalization?.runtimeState) },
        interactionEngine: { status: 'integrated', eventCount: asArray(source.collaborationEvents).length }
      },
      versionCompatibility: {
        schemaVersion: UNIVERSAL_COLLABORATIVE_LEARNING_SCHEMA_VERSION,
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

export function validateUniversalCollaborativeLearningOutput(output = {}) {
  const source = isObject(output) ? output : {};
  const errors = [];
  const warnings = [];

  if (!safeString(source.sessionId)) errors.push('Missing sessionId.');
  if (!safeString(source.lessonId)) errors.push('Missing lessonId.');

  if (!isObject(source.communicationContract) || safeString(source.communicationContract.mode) !== 'runtime-graph-events-only') {
    errors.push('communicationContract.mode must be runtime-graph-events-only.');
  }

  [
    'collaborationModels',
    'participantTypes',
    'capabilities',
    'collaborationGraph',
    'classroomMetadata',
    'groupMetadata',
    'teamMetadata',
    'sharedLearningState',
    'sessionRecoveryMetadata',
    'diagnostics',
    'synchronization'
  ].forEach((field) => {
    if (!isObject(source[field])) {
      errors.push(`${field} must be an object.`);
    }
  });

  [
    'participantMetadata',
    'roles',
    'permissions',
    'discussionEvents',
    'questionEvents',
    'answerEvents',
    'reviewEvents',
    'feedbackEvents',
    'runtimeGraphEvents'
  ].forEach((field) => {
    if (!Array.isArray(source[field])) {
      errors.push(`${field} must be an array.`);
    }
  });

  const requiredEventTypes = [
    'collaboration-graph',
    'classroom-metadata',
    'group-metadata',
    'team-metadata',
    'participant-metadata',
    'roles',
    'permissions',
    'shared-learning-state',
    'discussion-events',
    'question-events',
    'answer-events',
    'review-events',
    'feedback-events',
    'assignment-metadata',
    'collaboration-analytics',
    'participation-analytics',
    'conflict-resolution-metadata',
    'session-recovery-metadata'
  ];

  const foundEventTypes = new Set(asArray(source.runtimeGraphEvents).map((event) => safeString(event?.eventType)));
  requiredEventTypes.forEach((eventType) => {
    if (!foundEventTypes.has(eventType)) {
      errors.push(`Missing runtime graph event ${eventType}.`);
    }
  });

  const serialized = JSON.stringify(source);
  if (/webrtc|video|audio|three\.|renderer|webgl|speech/i.test(serialized)) {
    errors.push('Forbidden transport/renderer payload detected.');
  }

  if (asArray(source?.collaborationModels?.unknownFutureCollaborationModels).length > 0) {
    warnings.push('Unknown future collaboration models were preserved automatically.');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    status: errors.length === 0 ? (warnings.length ? 'warning' : 'valid') : 'invalid'
  };
}

export function serializeUniversalCollaborativeLearningOutput(output = {}) {
  return JSON.stringify({
    schemaVersion: UNIVERSAL_COLLABORATIVE_LEARNING_SCHEMA_VERSION,
    serializedAt: Date.now(),
    output
  });
}

export function migrateUniversalCollaborativeLearningOutput(input = {}) {
  const source = isObject(input) ? input : {};

  if (safeString(source.schemaVersion) === UNIVERSAL_COLLABORATIVE_LEARNING_SCHEMA_VERSION && Array.isArray(source.runtimeGraphEvents)) {
    return source;
  }

  const lessonId = safeString(source.lessonId || source.id || 'legacy-collab') || 'legacy-collab';
  const migrated = buildOutput({}, {
    lessonGraph: {
      lessonId,
      title: safeString(source.title || source.classroomName || 'Recovered Collaboration Session') || 'Recovered Collaboration Session',
      language: safeString(source.language || 'English') || 'English',
      learningObjectives: asArray(source.learningObjectives),
      keyConcepts: asArray(source.keyConcepts),
      collaborationModels: asArray(source.collaborationModels)
    },
    userProfiles: asArray(source.participants).map((participant) => ({
      id: participant?.participantId || participant?.id || participant?.name,
      role: participant?.role || participant?.participantType || 'learner',
      displayName: participant?.displayName || participant?.name || 'Participant',
      participantType: participant?.participantType || participant?.role || 'learner',
      preferredLanguage: participant?.language || 'English'
    })),
    participantTypes: asArray(source.participantTypes),
    collaborationModels: asArray(source.collaborationModels)
  }, createDefaultState(), DEFAULT_UNIVERSAL_COLLABORATIVE_LEARNING_CONFIG);

  return {
    ...migrated,
    diagnostics: {
      ...migrated.diagnostics,
      migratedFromSchema: safeString(source.schemaVersion || 'legacy') || 'legacy'
    }
  };
}

export function deserializeUniversalCollaborativeLearningOutput(payload = '') {
  const parsed = parsePayload(payload);
  if (!parsed) {
    const fallback = migrateUniversalCollaborativeLearningOutput({
      lessonId: 'recovered-collab-lesson',
      title: 'Recovered Collaboration Session'
    });

    return {
      output: fallback,
      validation: {
        valid: false,
        status: 'fallback',
        errors: ['Failed to parse collaborative learning payload.'],
        warnings: []
      }
    };
  }

  const output = migrateUniversalCollaborativeLearningOutput(parsed.output || parsed);
  return {
    output,
    validation: validateUniversalCollaborativeLearningOutput(output)
  };
}

export class UniversalCollaborativeLearningGroupTeachingEngine {
  constructor(runtime = {}, options = {}) {
    this.runtime = runtime;
    this.options = {
      ...DEFAULT_UNIVERSAL_COLLABORATIVE_LEARNING_CONFIG,
      ...(isObject(options) ? options : {})
    };

    this.persistenceAdapter = this.options.persistenceAdapter || createDefaultPersistenceAdapter();
    this.persistenceKey = safeString(this.options.persistenceKey || DEFAULT_UNIVERSAL_COLLABORATIVE_LEARNING_CONFIG.persistenceKey)
      || DEFAULT_UNIVERSAL_COLLABORATIVE_LEARNING_CONFIG.persistenceKey;

    this.state = createDefaultState();
    this.recoverSession();
  }

  generate(input = {}) {
    const startedAt = Date.now();
    const output = buildOutput(this.runtime, input, this.state, this.options);
    const validation = validateUniversalCollaborativeLearningOutput(output);

    this.state.output = output;
    this.state.status = validation.valid ? 'Ready' : 'Warning';
    this.state.diagnostics.runs += 1;
    this.state.diagnostics.latestDurationMs = Math.max(0, Date.now() - startedAt);
    this.state.diagnostics.warnings = [...this.state.diagnostics.warnings, ...validation.warnings].slice(-this.options.maxHistory);

    pushHistory(this.state, {
      type: 'collaboration-generated',
      sessionId: output.sessionId,
      at: Date.now(),
      valid: validation.valid
    }, this.options.maxHistory, 'recentEvents');

    this.state.history.collaborationTimeline = asArray(output.discussionEvents).slice(-this.options.maxHistory);
    this.state.participantSync = {
      version: Math.max(1, toFiniteNumber(this.state.participantSync?.version, 0) + 1),
      participants: asArray(output.participantMetadata)
    };

    this.runtime.metadata = {
      ...(this.runtime.metadata || {}),
      collaborationAdapter: {
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
        mode: output?.classroomMetadata?.mode || 'small-group'
      }
    };
  }

  synchronize(reason = 'manual', input = {}) {
    const result = this.generate(input);
    pushHistory(this.state, {
      type: 'collaboration-synchronized',
      reason: safeString(reason) || 'manual',
      at: Date.now()
    }, this.options.maxHistory, 'recentEvents');

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
      type: 'collaboration-interrupted',
      reason: safeString(reason) || 'interrupted',
      at: Date.now()
    }, this.options.maxHistory, 'recentEvents');
    this.persistSession();
    return true;
  }

  markDisconnected(reason = 'disconnected') {
    this.state.recovery.disconnected = true;
    pushHistory(this.state, {
      type: 'collaboration-disconnected',
      reason: safeString(reason) || 'disconnected',
      at: Date.now()
    }, this.options.maxHistory, 'recentEvents');
    this.persistSession();
    return true;
  }

  markOffline(reason = 'offline') {
    this.state.recovery.offline = true;
    pushHistory(this.state, {
      type: 'collaboration-offline',
      reason: safeString(reason) || 'offline',
      at: Date.now()
    }, this.options.maxHistory, 'recentEvents');
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
      collaborationEvents: asArray(this.runtime?.sceneEventRuntime?.events)
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

    pushHistory(this.state, {
      type: 'timeline-mutation',
      mutationType: safeType,
      context,
      at: Date.now()
    }, this.options.maxHistory, 'recentEvents');

    return this.synchronize(`mutation:${safeType}`, {
      collaborationEvents: asArray(this.runtime?.sceneEventRuntime?.events)
    });
  }

  persistSession(adapter = this.persistenceAdapter) {
    if (!adapter) return false;

    const payload = JSON.stringify({
      schemaVersion: UNIVERSAL_COLLABORATIVE_LEARNING_SCHEMA_VERSION,
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
        recentEvents: asArray(source?.history?.recentEvents).slice(-this.options.maxHistory),
        collaborationTimeline: asArray(source?.history?.collaborationTimeline).slice(-this.options.maxHistory)
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
      'collaboration-generated',
      'collaboration-synchronized',
      'collaboration-persisted',
      'collaboration-recovered',
      'collaboration-destroyed'
    ];
  }
}

export function createUniversalCollaborativeLearningGroupTeachingEngine(runtime = {}, options = {}) {
  return new UniversalCollaborativeLearningGroupTeachingEngine(runtime, options);
}

export function runUniversalCollaborativeLearningGroupTeachingEngine(input = {}, options = {}) {
  const runtime = isObject(options.runtime) ? options.runtime : {};
  const normalizedOptions = {
    ...options
  };
  delete normalizedOptions.runtime;

  const engine = createUniversalCollaborativeLearningGroupTeachingEngine(runtime, normalizedOptions);
  return engine.generate(input);
}
