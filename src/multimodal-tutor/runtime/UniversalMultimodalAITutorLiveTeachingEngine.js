import {
  UNIVERSAL_MULTIMODAL_AI_TUTOR_SCHEMA_VERSION,
  SUPPORTED_BASE_TEACHING_MODALITIES,
  SUPPORTED_BASE_TUTOR_CAPABILITIES,
  DEFAULT_UNIVERSAL_MULTIMODAL_AI_TUTOR_CONFIG,
  isObject,
  asArray,
  safeString,
  toFiniteNumber,
  clamp,
  uniqueStrings,
  normalizeTeachingModality,
  normalizeTutorCapability
} from './UniversalMultimodalAITutorLiveTeachingEngineConfig.js';

const STORE_KEY = '__daksha_universal_multimodal_ai_tutor_store__';

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
    schemaVersion: UNIVERSAL_MULTIMODAL_AI_TUTOR_SCHEMA_VERSION,
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
      checkpointId: null,
      resumeTimeMs: 0,
      resumeCount: 0
    },
    history: {
      recentEvents: []
    }
  };
}

function pushHistory(state = {}, entry = {}, maxHistory = 1200) {
  const events = asArray(state?.history?.recentEvents);
  events.push(entry);
  while (events.length > maxHistory) {
    events.shift();
  }
  state.history.recentEvents = events;
}

function resolveInput(runtime = {}, input = {}) {
  return {
    lessonGraph: isObject(input.lessonGraph) ? input.lessonGraph : runtime?.metadata?.lessonGraph || {},
    runtimeGraph: isObject(input.runtimeGraph) ? input.runtimeGraph : runtime?.graph || {},
    timeline: isObject(input.timeline) ? input.timeline : runtime?.metadata?.timeline || runtime?.metadata?.timelineData || {},
    aiTeacherMetadata: isObject(input.aiTeacherMetadata) ? input.aiTeacherMetadata : runtime?.metadata?.aiTeacherAdapter || {},
    knowledgeGraph: isObject(input.knowledgeGraph) ? input.knowledgeGraph : runtime?.metadata?.knowledgeMemoryAdapter?.output?.knowledgeGraph || {},
    userLearningProfile: isObject(input.userLearningProfile) ? input.userLearningProfile : runtime?.metadata?.userLearningProfile || runtime?.metadata?.learningProfile || {},
    learningAnalytics: isObject(input.learningAnalytics) ? input.learningAnalytics : runtime?.metadata?.learningAnalyticsAdapter || {},
    interactionEvents: asArray(input.interactionEvents).length ? asArray(input.interactionEvents) : asArray(runtime?.sceneEventRuntime?.events),
    assessmentResults: isObject(input.assessmentResults) ? input.assessmentResults : runtime?.metadata?.assessmentAdapter || {},
    learningGoals: asArray(input.learningGoals),
    modalities: asArray(input.modalities),
    tutorCapabilities: asArray(input.tutorCapabilities),
    supportedLanguages: asArray(input.supportedLanguages),
    personalization: isObject(input.personalization) ? input.personalization : runtime?.metadata?.personalizationAdaptiveAdapter || {},
    pipeline: isObject(input.pipeline) ? input.pipeline : runtime?.metadata?.pipeline || runtime?.metadata?.sourceMeta || {},
    learningIntent: isObject(input.learningIntent) ? input.learningIntent : runtime?.metadata?.intentProfile || runtime?.metadata?.learningIntent || {}
  };
}

function resolveLanguage(source = {}, options = {}) {
  const profileLanguage = safeString(source.userLearningProfile?.language || source.userLearningProfile?.preferredLanguage || '');
  const lessonLanguage = safeString(source.lessonGraph?.language || '');
  const intentLanguage = safeString(source.learningIntent?.language || '');
  const selectedLanguage = profileLanguage || lessonLanguage || intentLanguage || safeString(options.defaultLanguage || 'English') || 'English';

  const supportedLanguages = uniqueStrings([
    ...asArray(source.supportedLanguages),
    ...asArray(source.userLearningProfile?.supportedLanguages),
    ...asArray(source.pipeline?.supportedLanguages),
    selectedLanguage
  ], 48);

  return {
    selectedLanguage,
    supportedLanguages
  };
}

function resolveModalities(source = {}) {
  const requested = uniqueStrings([
    ...asArray(source.modalities),
    ...asArray(source.userLearningProfile?.preferredModalities),
    ...asArray(source.learningIntent?.preferredModalities),
    ...asArray(source.pipeline?.modalities),
    ...SUPPORTED_BASE_TEACHING_MODALITIES
  ], 240);

  const normalized = requested.map((item) => normalizeTeachingModality(item));
  const activeModalities = uniqueStrings(normalized.map((item) => item.modality), 240);
  const unknownFutureTeachingModalities = uniqueStrings(
    normalized.filter((item) => !item.known).map((item) => item.modality),
    200
  );

  return {
    activeModalities,
    unknownFutureTeachingModalities
  };
}

function resolveTutorCapabilities(source = {}) {
  const requested = uniqueStrings([
    ...asArray(source.tutorCapabilities),
    ...asArray(source.learningIntent?.tutorCapabilities),
    ...asArray(source.aiTeacherMetadata?.output?.teachingCapabilities),
    ...SUPPORTED_BASE_TUTOR_CAPABILITIES
  ], 320);

  const normalized = requested.map((item) => normalizeTutorCapability(item));
  return {
    enabledCapabilities: uniqueStrings(normalized.map((item) => item.capability), 320),
    unknownCapabilities: uniqueStrings(normalized.filter((item) => !item.known).map((item) => item.capability), 220)
  };
}

function computeAdaptiveSignals(source = {}) {
  const analyticsOutput = isObject(source.learningAnalytics?.output) ? source.learningAnalytics.output : source.learningAnalytics;
  const assessmentOutput = isObject(source.assessmentResults?.output) ? source.assessmentResults.output : source.assessmentResults;

  const progress = clamp(
    assessmentOutput?.completionScore ?? analyticsOutput?.learningProgress?.lessonCompletion ?? analyticsOutput?.output?.learningProgress?.lessonCompletion ?? 0.5,
    0,
    1
  );
  const confidence = clamp(
    assessmentOutput?.learningConfidence ?? analyticsOutput?.learningConfidence ?? analyticsOutput?.confidenceScore ?? 0.55,
    0,
    1
  );
  const mistakes = Math.max(0, toFiniteNumber(assessmentOutput?.mistakes ?? analyticsOutput?.mistakes ?? 0, 0));
  const mastery = clamp(
    assessmentOutput?.masteryScore ?? analyticsOutput?.masteryScore ?? 0.55,
    0,
    1
  );
  const pace = clamp(
    source.personalization?.output?.adaptivePacing?.recommendedPace ?? source.userLearningProfile?.learningPace ?? 1,
    0.4,
    2
  );
  const interactionHistoryDensity = clamp(
    asArray(source.interactionEvents).length / Math.max(8, asArray(source.interactionEvents).length + 4),
    0,
    1
  );

  const learningGoals = uniqueStrings([
    ...asArray(source.learningGoals),
    ...asArray(source.lessonGraph?.learningObjectives),
    ...asArray(source.personalization?.output?.personalizedObjectives).map((item) => item?.objective || item),
    ...asArray(source.learningIntent?.learningGoals)
  ], 180);

  return {
    learnerProgress: progress,
    confidence,
    mistakes,
    pace,
    mastery,
    interactionHistoryDensity,
    learningGoals,
    adaptationMode: mistakes > 2 || confidence < 0.45 ? 'guided-recovery' : mastery > 0.8 ? 'challenge-expansion' : 'balanced-coaching',
    challengeLevel: mastery > 0.75 ? 'advanced' : mastery > 0.45 ? 'intermediate' : 'foundational'
  };
}

function buildTeachingPlan(source = {}, adaptation = {}, language = 'English') {
  const concepts = uniqueStrings([
    ...asArray(source.lessonGraph?.keyConcepts),
    ...asArray(source.lessonGraph?.topics),
    ...asArray(source.knowledgeGraph?.nodes).map((node) => node?.label || node?.id)
  ], 180);

  const planSteps = concepts.slice(0, 80).map((concept, index) => ({
    id: `teaching-plan-${index + 1}`,
    capability: index % 6 === 0 ? 'explain' : index % 6 === 1 ? 'demonstrate' : index % 6 === 2 ? 'compare' : index % 6 === 3 ? 'visualize' : index % 6 === 4 ? 'coach' : 'recap',
    focus: concept,
    objective: `Enable learner to apply ${concept} with ${adaptation.challengeLevel} confidence.`,
    modalityHint: index % 2 === 0 ? 'diagram-metadata' : 'text',
    language
  }));

  if (planSteps.length > 0) {
    return {
      mode: adaptation.adaptationMode,
      challengeLevel: adaptation.challengeLevel,
      steps: planSteps
    };
  }

  return {
    mode: adaptation.adaptationMode,
    challengeLevel: adaptation.challengeLevel,
    steps: [{
      id: 'teaching-plan-1',
      capability: 'explain',
      focus: safeString(source.lessonGraph?.title || 'Open Topic') || 'Open Topic',
      objective: 'Establish conceptual understanding and adaptive guidance.',
      modalityHint: 'text',
      language
    }]
  };
}

function buildLiveTeachingFlow(plan = {}, source = {}, options = {}) {
  const timelineEvents = asArray(source.timeline?.clips || source.timeline?.timelineSteps || source.timeline?.events);
  const steps = asArray(plan.steps);

  return steps.slice(0, options.maxPlanSteps).map((step, index) => ({
    id: `live-flow-${index + 1}`,
    planStepId: step.id,
    phase: index % 5 === 0 ? 'explain' : index % 5 === 1 ? 'demonstrate' : index % 5 === 2 ? 'question' : index % 5 === 3 ? 'practice' : 'reflection',
    capability: step.capability,
    startHintMs: Math.max(0, toFiniteNumber(timelineEvents[index]?.start || index * 1500, index * 1500)),
    durationHintMs: Math.max(800, toFiniteNumber(timelineEvents[index]?.duration || 1400, 1400)),
    targetNodeId: safeString(asArray(source.knowledgeGraph?.nodes)[index]?.id || asArray(source.lessonGraph?.lessonGraph?.nodes)[index]?.id || ''),
    adaptiveAction: index % 4 === 0 ? 'scaffold' : index % 4 === 1 ? 'prompt' : index % 4 === 2 ? 'checkpoint' : 'reinforce'
  }));
}

function buildCue(idPrefix, flow = [], cueType = 'visual', max = 300) {
  return asArray(flow).slice(0, max).map((step, index) => ({
    id: `${idPrefix}-${index + 1}`,
    stepId: step.id,
    cueType,
    cue: cueType === 'visual'
      ? `Highlight ${step.targetNodeId || 'concept-node'} for ${step.phase}`
      : cueType === 'scene'
        ? `Focus scene on ${step.targetNodeId || 'learning-target'} for ${step.phase}`
        : cueType === 'timeline'
          ? `Trigger ${step.phase} at ${step.startHintMs}ms`
          : `Expect learner interaction during ${step.phase}`,
    startHintMs: step.startHintMs,
    durationHintMs: step.durationHintMs
  }));
}

function buildPrompts(source = {}, adaptation = {}, language = 'English', max = 220) {
  const goals = adaptation.learningGoals.length ? adaptation.learningGoals : ['Understand key concepts'];
  const concepts = uniqueStrings([
    ...asArray(source.lessonGraph?.keyConcepts),
    ...asArray(source.lessonGraph?.topics),
    safeString(source.lessonGraph?.title)
  ], 120);

  const questionPrompts = concepts.slice(0, max).map((concept, index) => ({
    id: `question-prompt-${index + 1}`,
    type: 'question',
    prompt: `How would you explain ${concept} in your own words?`,
    language
  }));

  const practicePrompts = goals.slice(0, max).map((goal, index) => ({
    id: `practice-prompt-${index + 1}`,
    type: 'practice',
    prompt: `Apply this goal in a short exercise: ${goal}.`,
    challengeLevel: adaptation.challengeLevel,
    language
  }));

  const reflectionPrompts = goals.slice(0, max).map((goal, index) => ({
    id: `reflection-prompt-${index + 1}`,
    type: 'reflection',
    prompt: `Reflect on what improved for: ${goal}.`,
    language
  }));

  const checkpointPrompts = concepts.slice(0, max).map((concept, index) => ({
    id: `checkpoint-prompt-${index + 1}`,
    type: 'checkpoint',
    prompt: `Checkpoint: rate your confidence on ${concept} from 1-5.`,
    language
  }));

  const revisionPrompts = concepts.slice(0, max).map((concept, index) => ({
    id: `revision-prompt-${index + 1}`,
    type: 'revision',
    prompt: `Revise ${concept} by summarizing one key principle and one application.`,
    language
  }));

  return {
    questionPrompts,
    practicePrompts,
    reflectionPrompts,
    checkpointPrompts,
    revisionPrompts
  };
}

function buildMultimodalMetadata(activeModalities = [], flow = [], options = {}) {
  const payload = {};

  asArray(activeModalities).forEach((modality) => {
    payload[modality] = asArray(flow).slice(0, options.maxCues).map((step, index) => ({
      id: `${modality}-payload-${index + 1}`,
      stepId: step.id,
      role: step.phase,
      descriptor: `${modality} descriptor for ${step.phase}`,
      startHintMs: step.startHintMs,
      durationHintMs: step.durationHintMs
    }));
  });

  return payload;
}

function buildRuntimeGraphEvents(payload = {}, options = {}) {
  const events = [];

  function pushEvent(eventType, channel, data) {
    if (events.length >= options.maxEvents) return;
    events.push({
      id: `runtime-event-${events.length + 1}`,
      eventType,
      channel,
      timestampMs: Date.now(),
      payload: data
    });
  }

  pushEvent('tutor-teaching-plan', 'runtime-graph.tutor.plan', payload.teachingPlan);
  pushEvent('tutor-live-flow', 'runtime-graph.tutor.live-flow', payload.liveTeachingFlow);
  pushEvent('tutor-visual-cues', 'runtime-graph.tutor.visual-cues', payload.visualTeachingCues);
  pushEvent('tutor-scene-cues', 'runtime-graph.tutor.scene-cues', payload.sceneCues);
  pushEvent('tutor-timeline-cues', 'runtime-graph.tutor.timeline-cues', payload.timelineCues);
  pushEvent('tutor-interaction-cues', 'runtime-graph.tutor.interaction-cues', payload.interactionCues);
  pushEvent('tutor-question-prompts', 'runtime-graph.tutor.question-prompts', payload.questionPrompts);
  pushEvent('tutor-practice-prompts', 'runtime-graph.tutor.practice-prompts', payload.practicePrompts);
  pushEvent('tutor-reflection-prompts', 'runtime-graph.tutor.reflection-prompts', payload.reflectionPrompts);
  pushEvent('tutor-checkpoint-prompts', 'runtime-graph.tutor.checkpoint-prompts', payload.checkpointPrompts);
  pushEvent('tutor-revision-prompts', 'runtime-graph.tutor.revision-prompts', payload.revisionPrompts);
  pushEvent('tutor-multimodal-payloads', 'runtime-graph.tutor.multimodal-payloads', payload.multimodalMetadata);

  return events;
}

function buildOutput(runtime = {}, input = {}, options = {}) {
  const source = resolveInput(runtime, input);
  const languageResolution = resolveLanguage(source, options);
  const modalityResolution = resolveModalities(source);
  const capabilityResolution = resolveTutorCapabilities(source);
  const adaptiveSignals = computeAdaptiveSignals(source);
  const runtimeGraphSummary = inferRuntimeGraphSummary(source.runtimeGraph);

  const teachingPlan = buildTeachingPlan(source, adaptiveSignals, languageResolution.selectedLanguage);
  const liveTeachingFlow = buildLiveTeachingFlow(teachingPlan, source, options);
  const visualTeachingCues = buildCue('visual-cue', liveTeachingFlow, 'visual', options.maxCues);
  const sceneCues = buildCue('scene-cue', liveTeachingFlow, 'scene', options.maxCues);
  const timelineCues = buildCue('timeline-cue', liveTeachingFlow, 'timeline', options.maxCues);
  const interactionCues = buildCue('interaction-cue', liveTeachingFlow, 'interaction', options.maxCues);

  const prompts = buildPrompts(source, adaptiveSignals, languageResolution.selectedLanguage, options.maxPrompts);
  const multimodalMetadata = buildMultimodalMetadata(modalityResolution.activeModalities, liveTeachingFlow, options);

  const outputBase = {
    schemaVersion: UNIVERSAL_MULTIMODAL_AI_TUTOR_SCHEMA_VERSION,
    tutorSessionId: safeString(source.lessonGraph?.lessonId || source.timeline?.timelineId || `multimodal-tutor-${Date.now()}`) || `multimodal-tutor-${Date.now()}`,
    lessonId: safeString(source.lessonGraph?.lessonId || 'runtime-lesson') || 'runtime-lesson',
    language: languageResolution.selectedLanguage,
    supportedLanguages: languageResolution.supportedLanguages,
    communicationContract: {
      mode: 'runtime-graph-events-only',
      eventNamespace: 'runtime-graph.tutor'
    },
    inputsSummary: {
      runtimeGraphNodeCount: runtimeGraphSummary.nodeCount,
      runtimeGraphRelationshipCount: runtimeGraphSummary.relationshipCount,
      timelineEventCount: asArray(source.timeline?.clips || source.timeline?.events || source.timeline?.timelineSteps).length,
      interactionEventCount: asArray(source.interactionEvents).length,
      knowledgeGraphNodeCount: asArray(source.knowledgeGraph?.nodes).length
    },
    tutorCapabilities: capabilityResolution,
    teachingModalities: {
      activeModalities: modalityResolution.activeModalities,
      unknownFutureTeachingModalities: modalityResolution.unknownFutureTeachingModalities
    },
    adaptiveTutoring: adaptiveSignals,
    teachingPlan,
    liveTeachingFlow,
    visualTeachingCues,
    sceneCues,
    timelineCues,
    interactionCues,
    questionPrompts: prompts.questionPrompts,
    practicePrompts: prompts.practicePrompts,
    reflectionPrompts: prompts.reflectionPrompts,
    checkpointPrompts: prompts.checkpointPrompts,
    revisionPrompts: prompts.revisionPrompts,
    multimodalMetadata,
    diagnostics: {
      generatedAt: Date.now(),
      adaptationMode: adaptiveSignals.adaptationMode,
      challengeLevel: adaptiveSignals.challengeLevel,
      unknownFutureModalityCount: modalityResolution.unknownFutureTeachingModalities.length,
      unknownCapabilityCount: capabilityResolution.unknownCapabilities.length
    },
    synchronization: {
      integration: {
        universalLearningPipeline: { status: 'integrated', hasPipeline: isObject(source.pipeline) },
        lessonGenerator: { status: 'integrated', hasLessonGraph: isObject(source.lessonGraph) },
        aiTeacher: { status: 'integrated', hasTeacherMetadata: isObject(source.aiTeacherMetadata) },
        runtimeGraph: { status: 'integrated', nodeCount: runtimeGraphSummary.nodeCount, relationshipCount: runtimeGraphSummary.relationshipCount },
        timelineEngine: { status: 'integrated', timelineEntries: asArray(source.timeline?.clips || source.timeline?.events || source.timeline?.timelineSteps).length },
        knowledgeGraph: { status: 'integrated', nodeCount: asArray(source.knowledgeGraph?.nodes).length },
        assessmentEngine: { status: 'integrated', hasAssessment: Boolean(source.assessmentResults?.output || source.assessmentResults?.questionBank) },
        learningAnalytics: { status: 'integrated', hasAnalytics: Boolean(source.learningAnalytics?.output || source.learningAnalytics?.masteryScore) },
        personalizationEngine: { status: 'integrated', hasPersonalization: Boolean(source.personalization?.output || source.personalization?.runtimeState) }
      },
      versionCompatibility: {
        schemaVersion: UNIVERSAL_MULTIMODAL_AI_TUTOR_SCHEMA_VERSION,
        backwardCompatible: true,
        forwardCompatible: true
      }
    }
  };

  const runtimeGraphEvents = buildRuntimeGraphEvents(outputBase, options);

  return {
    ...outputBase,
    runtimeGraphEvents
  };
}

function hasArray(value) {
  return Array.isArray(value);
}

export function validateUniversalMultimodalAITutorOutput(output = {}) {
  const source = isObject(output) ? output : {};
  const errors = [];
  const warnings = [];

  if (!safeString(source.tutorSessionId)) errors.push('Missing tutorSessionId.');
  if (!safeString(source.lessonId)) errors.push('Missing lessonId.');
  if (!safeString(source.language)) errors.push('Missing language.');

  if (!isObject(source.communicationContract) || safeString(source.communicationContract.mode) !== 'runtime-graph-events-only') {
    errors.push('communicationContract.mode must be runtime-graph-events-only.');
  }

  [
    'teachingPlan',
    'adaptiveTutoring',
    'teachingModalities',
    'tutorCapabilities',
    'multimodalMetadata',
    'diagnostics',
    'synchronization'
  ].forEach((field) => {
    if (!isObject(source[field])) {
      errors.push(`${field} must be an object.`);
    }
  });

  [
    'liveTeachingFlow',
    'visualTeachingCues',
    'sceneCues',
    'timelineCues',
    'interactionCues',
    'questionPrompts',
    'practicePrompts',
    'reflectionPrompts',
    'checkpointPrompts',
    'revisionPrompts',
    'runtimeGraphEvents'
  ].forEach((field) => {
    if (!hasArray(source[field])) {
      errors.push(`${field} must be an array.`);
    }
  });

  const modalityList = asArray(source?.teachingModalities?.activeModalities);
  if (!modalityList.length) {
    errors.push('At least one teaching modality is required.');
  }

  const eventTypes = new Set(asArray(source.runtimeGraphEvents).map((event) => safeString(event?.eventType)));
  const requiredEventTypes = [
    'tutor-teaching-plan',
    'tutor-live-flow',
    'tutor-visual-cues',
    'tutor-scene-cues',
    'tutor-timeline-cues',
    'tutor-interaction-cues',
    'tutor-question-prompts',
    'tutor-practice-prompts',
    'tutor-reflection-prompts',
    'tutor-checkpoint-prompts',
    'tutor-revision-prompts',
    'tutor-multimodal-payloads'
  ];

  requiredEventTypes.forEach((eventType) => {
    if (!eventTypes.has(eventType)) {
      errors.push(`Missing runtime graph event: ${eventType}`);
    }
  });

  const serialized = JSON.stringify(source);
  if (/speechsynthesis|texttospeech|ttsengine|videogeneration|three\.|webglrenderer|shader|fragment|vertex|canvascontext/i.test(serialized)) {
    errors.push('Forbidden rendering or synthesis payload detected.');
  }

  if (asArray(source?.teachingModalities?.unknownFutureTeachingModalities).length > 0) {
    warnings.push('Unknown future modalities detected and preserved automatically.');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    status: errors.length === 0 ? (warnings.length ? 'warning' : 'valid') : 'invalid'
  };
}

export function serializeUniversalMultimodalAITutorOutput(output = {}) {
  return JSON.stringify({
    schemaVersion: UNIVERSAL_MULTIMODAL_AI_TUTOR_SCHEMA_VERSION,
    serializedAt: Date.now(),
    output
  });
}

export function migrateUniversalMultimodalAITutorOutput(input = {}) {
  const source = isObject(input) ? input : {};

  if (safeString(source.schemaVersion) === UNIVERSAL_MULTIMODAL_AI_TUTOR_SCHEMA_VERSION && hasArray(source.runtimeGraphEvents)) {
    return source;
  }

  const lessonId = safeString(source.lessonId || source.id || 'legacy-lesson') || 'legacy-lesson';
  const fallback = buildOutput({}, {
    lessonGraph: {
      lessonId,
      title: safeString(source.title || 'Recovered Tutor Session') || 'Recovered Tutor Session',
      language: safeString(source.language || 'English') || 'English',
      keyConcepts: asArray(source.topics)
    },
    modalities: asArray(source.modalities)
  }, DEFAULT_UNIVERSAL_MULTIMODAL_AI_TUTOR_CONFIG);

  return {
    ...fallback,
    diagnostics: {
      ...fallback.diagnostics,
      migratedFromSchema: safeString(source.schemaVersion || 'legacy') || 'legacy'
    }
  };
}

export function deserializeUniversalMultimodalAITutorOutput(payload = '') {
  const parsed = parsePayload(payload);
  if (!parsed) {
    const fallback = migrateUniversalMultimodalAITutorOutput({
      lessonId: 'recovered-lesson',
      title: 'Recovered Tutor Session'
    });

    return {
      output: fallback,
      validation: {
        valid: false,
        status: 'fallback',
        errors: ['Failed to parse multimodal tutor payload.'],
        warnings: []
      }
    };
  }

  const output = migrateUniversalMultimodalAITutorOutput(parsed.output || parsed);
  return {
    output,
    validation: validateUniversalMultimodalAITutorOutput(output)
  };
}

export class UniversalMultimodalAITutorLiveTeachingEngine {
  constructor(runtime = {}, options = {}) {
    this.runtime = runtime;
    this.options = {
      ...DEFAULT_UNIVERSAL_MULTIMODAL_AI_TUTOR_CONFIG,
      ...(isObject(options) ? options : {})
    };

    this.persistenceAdapter = this.options.persistenceAdapter || createDefaultPersistenceAdapter();
    this.persistenceKey = safeString(this.options.persistenceKey || DEFAULT_UNIVERSAL_MULTIMODAL_AI_TUTOR_CONFIG.persistenceKey)
      || DEFAULT_UNIVERSAL_MULTIMODAL_AI_TUTOR_CONFIG.persistenceKey;

    this.state = createDefaultState();
    this.recoverSession();
  }

  generate(input = {}) {
    const startedAt = Date.now();
    const output = buildOutput(this.runtime, input, this.options);
    const validation = validateUniversalMultimodalAITutorOutput(output);

    this.state.output = output;
    this.state.status = validation.valid ? 'Ready' : 'Warning';
    this.state.diagnostics.runs += 1;
    this.state.diagnostics.latestDurationMs = Math.max(0, Date.now() - startedAt);
    this.state.diagnostics.warnings = [...this.state.diagnostics.warnings, ...validation.warnings].slice(-this.options.maxHistory);

    pushHistory(this.state, {
      type: 'multimodal-tutor-generated',
      tutorSessionId: output.tutorSessionId,
      lessonId: output.lessonId,
      at: Date.now(),
      valid: validation.valid
    }, this.options.maxHistory);

    this.runtime.metadata = {
      ...(this.runtime.metadata || {}),
      multimodalTutorAdapter: {
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
        adaptationMode: output?.adaptiveTutoring?.adaptationMode || 'balanced-coaching'
      }
    };
  }

  synchronize(reason = 'manual', input = {}) {
    const result = this.generate(input);
    pushHistory(this.state, {
      type: 'multimodal-tutor-synchronized',
      reason: safeString(reason) || 'manual',
      at: Date.now()
    }, this.options.maxHistory);

    return {
      ...this.snapshot(),
      lastSynchronizationReason: safeString(reason) || 'manual',
      result
    };
  }

  handleExternalTimelineMutation(mutationType = 'manual', context = {}) {
    const safeType = safeString(mutationType || 'manual') || 'manual';

    if (safeType.includes('pause')) {
      this.state.recovery.interrupted = true;
      this.state.status = 'Paused';
    }

    if (safeType.includes('resume') || safeType.includes('recover')) {
      this.state.recovery.interrupted = false;
      this.state.recovery.resumeCount += 1;
      this.state.status = 'Ready';
    }

    this.state.recovery.resumeTimeMs = Math.max(0, toFiniteNumber(this.runtime?.timelineScheduler?.snapshot?.()?.clock?.timeMs, this.state.recovery.resumeTimeMs));

    pushHistory(this.state, {
      type: 'timeline-mutation',
      mutationType: safeType,
      context,
      at: Date.now()
    }, this.options.maxHistory);

    return this.synchronize(`mutation:${safeType}`, {
      interactionEvents: asArray(this.runtime?.sceneEventRuntime?.events)
    });
  }

  markInterrupted(reason = 'interrupted') {
    this.state.recovery.interrupted = true;
    this.state.status = 'Paused';

    pushHistory(this.state, {
      type: 'interrupted',
      reason: safeString(reason) || 'interrupted',
      at: Date.now()
    }, this.options.maxHistory);

    this.persistSession();
    return true;
  }

  resumeFromCheckpoint(checkpointId = null) {
    const resolved = safeString(checkpointId || this.state.recovery.checkpointId || '') || null;
    this.state.recovery.checkpointId = resolved;
    this.state.recovery.interrupted = false;
    this.state.recovery.resumeCount += 1;
    this.state.status = 'Ready';

    return this.synchronize('resume-from-checkpoint', {
      interactionEvents: asArray(this.runtime?.sceneEventRuntime?.events)
    });
  }

  persistSession(adapter = this.persistenceAdapter) {
    if (!adapter) return false;

    const payload = JSON.stringify({
      schemaVersion: UNIVERSAL_MULTIMODAL_AI_TUTOR_SCHEMA_VERSION,
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
        recentEvents: asArray(source?.history?.recentEvents).slice(-this.options.maxHistory)
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
      'multimodal-tutor-generated',
      'multimodal-tutor-synchronized',
      'multimodal-tutor-persisted',
      'multimodal-tutor-recovered',
      'multimodal-tutor-destroyed'
    ];
  }
}

export function createUniversalMultimodalAITutorLiveTeachingEngine(runtime = {}, options = {}) {
  return new UniversalMultimodalAITutorLiveTeachingEngine(runtime, options);
}

export function runUniversalMultimodalAITutorLiveTeachingEngine(input = {}, options = {}) {
  const runtime = isObject(options.runtime) ? options.runtime : {};
  const normalizedOptions = {
    ...options
  };
  delete normalizedOptions.runtime;

  const engine = createUniversalMultimodalAITutorLiveTeachingEngine(runtime, normalizedOptions);
  return engine.generate(input);
}
