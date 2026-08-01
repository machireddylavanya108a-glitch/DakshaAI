import {
  DEFAULT_AI_TEACHER_ENGINE_CONFIG,
  UNIVERSAL_AI_TEACHER_SCHEMA_VERSION,
  SUPPORTED_LEARNING_LEVELS,
  SUPPORTED_LEARNER_MODES,
  SUPPORTED_TEACHING_ACTIONS,
  isObject,
  asArray,
  safeString,
  toFiniteNumber,
  clamp,
  normalizeLearningLevel,
  normalizeLearnerMode,
  normalizeTeachingAction
} from './UniversalAITeacherEngineConfig.js';

const STORE_KEY = '__daksha_universal_ai_teacher_engine_store__';

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

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function createChannelSet() {
  return new Map();
}

function safeEmit(listenersMap, channel, payload) {
  const listeners = listenersMap.get(channel);
  if (!listeners || listeners.size === 0) return;

  listeners.forEach((listener) => {
    try {
      listener(payload);
    } catch {
      // Listener failures are isolated from AI teacher runtime.
    }
  });
}

function uniqueStrings(input = [], max = 120) {
  const seen = new Set();
  const output = [];

  asArray(input).forEach((entry) => {
    const text = safeString(entry);
    if (!text) return;
    const key = text.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    output.push(text);
  });

  return output.slice(0, max);
}

function stableId(prefix, index, fallback = 'item') {
  const safePrefix = safeString(prefix) || fallback;
  return `${safePrefix}-${index + 1}`;
}

function getRuntimeGraphSummary(runtime = {}) {
  const graph = runtime?.graph;
  if (!graph) {
    return {
      nodeCount: 0,
      relationshipCount: 0
    };
  }

  return {
    nodeCount: toFiniteNumber(graph?.getNodeCount?.(), graph?.nodes?.size || 0),
    relationshipCount: toFiniteNumber(graph?.getRelationshipCount?.(), asArray(graph?.edges).length)
  };
}

function getTimelineSummary(runtime = {}) {
  const metadata = runtime?.metadata?.timeline || runtime?.sceneJson?.timeline || {};
  return {
    timelineId: safeString(metadata.timelineId || runtime?.sceneId || ''),
    version: safeString(metadata.version || 'v2') || 'v2',
    trackIds: asArray(metadata.trackIds),
    clipIds: asArray(metadata.clipIds),
    markerIds: asArray(metadata.markerIds),
    eventIds: asArray(metadata.eventIds)
  };
}

function getLessonGraph(runtime = {}) {
  const lessonGraph = runtime?.metadata?.lessonGraph;
  if (isObject(lessonGraph)) return lessonGraph;

  const nodes = asArray(runtime?.graph?.toJSON?.()?.nodes);
  const edges = asArray(runtime?.graph?.toJSON?.()?.edges);
  return {
    schemaVersion: UNIVERSAL_AI_TEACHER_SCHEMA_VERSION,
    lessonId: safeString(runtime?.sceneId || 'runtime-lesson'),
    title: safeString(runtime?.metadata?.title || runtime?.sceneJson?.title || 'Runtime Lesson') || 'Runtime Lesson',
    language: safeString(runtime?.metadata?.language || 'English') || 'English',
    learningObjectives: uniqueStrings(nodes.filter((node) => String(node?.type || node?.kind || '').toLowerCase().includes('objective')).map((node) => node?.label || node?.id), 24),
    keyConcepts: uniqueStrings(nodes.filter((node) => String(node?.type || node?.kind || '').toLowerCase().includes('concept')).map((node) => node?.label || node?.id), 48),
    timelineSteps: asArray(runtime?.metadata?.timelineData?.clips).map((clip, index) => ({
      id: safeString(clip?.id || stableId('timeline-step', index)),
      title: safeString(clip?.metadata?.title || clip?.id || stableId('step', index)),
      order: index + 1,
      startMs: Math.max(0, toFiniteNumber(clip?.start, index * 1000)),
      endMs: Math.max(0, toFiniteNumber(clip?.end, (index + 1) * 1000)),
      durationMs: Math.max(0, toFiniteNumber(clip?.duration, 1000))
    })),
    educationalObjects: nodes
      .filter((node) => {
        const sourceKey = String(node?.metadata?.sourceKey || '').toLowerCase();
        return sourceKey === 'objects' || sourceKey === 'educationalobjects' || sourceKey === 'educationalobjectinstances';
      })
      .map((node, index) => ({
        id: safeString(node?.id || stableId('educational-object', index)) || stableId('educational-object', index),
        name: safeString(node?.properties?.name || node?.label || node?.id || stableId('concept', index)),
        type: safeString(node?.kind || 'concept-node') || 'concept-node',
        metadata: isObject(node?.metadata) ? node.metadata : {}
      })),
    lessonGraph: {
      nodes,
      edges,
      metadata: {
        timelineId: safeString(runtime?.metadata?.timeline?.timelineId || ''),
        sceneId: safeString(runtime?.sceneId || '')
      }
    }
  };
}

function resolveLearningIntent(runtime = {}, input = {}) {
  const source = isObject(input) ? input : {};
  const runtimeIntent = runtime?.metadata?.intentProfile || runtime?.metadata?.learningIntent || {};
  return {
    ...runtimeIntent,
    ...source,
    learningObjective: safeString(source.learningObjective || runtimeIntent.learningObjective || 'Understand the lesson concepts'),
    confidenceScore: clamp(source.confidenceScore ?? runtimeIntent.confidenceScore ?? 0.6, 0, 1),
    language: safeString(source.language || runtimeIntent.language || runtime?.metadata?.language || 'English') || 'English',
    knowledgeDomain: safeString(source.knowledgeDomain || runtimeIntent.knowledgeDomain || runtime?.metadata?.subject || 'Open Domain') || 'Open Domain'
  };
}

function resolveVisualizationStrategy(runtime = {}, input = {}) {
  const source = isObject(input) ? input : {};
  const runtimeStrategy = runtime?.metadata?.visualizationStrategy || {};
  const primaryStrategy = isObject(source.primaryStrategy)
    ? source.primaryStrategy
    : isObject(runtimeStrategy.primaryStrategy)
      ? runtimeStrategy.primaryStrategy
      : {};

  return {
    ...runtimeStrategy,
    ...source,
    primaryStrategy: {
      visualizationStyle: safeString(primaryStrategy.visualizationStyle || 'adaptive visualization') || 'adaptive visualization',
      interactionLevel: safeString(primaryStrategy.interactionLevel || 'guided') || 'guided',
      sceneComplexity: safeString(primaryStrategy.sceneComplexity || 'medium') || 'medium',
      animationIntensity: safeString(primaryStrategy.animationIntensity || 'medium') || 'medium',
      narrationStrategy: safeString(primaryStrategy.narrationStrategy || 'concept-first narration') || 'concept-first narration'
    },
    confidenceScore: clamp(source.confidenceScore ?? runtimeStrategy.confidenceScore ?? 0.6, 0, 1)
  };
}

function resolveUserLearningProfile(input = {}) {
  const source = isObject(input) ? input : {};
  const learningLevel = normalizeLearningLevel(source.learningLevel || source.level || source.proficiency || 'intermediate');

  const learnerModesRaw = uniqueStrings([
    ...asArray(source.learnerModes),
    ...asArray(source.modes),
    ...asArray(source.profiles)
  ], 24);

  const learnerModes = learnerModesRaw.length
    ? learnerModesRaw.map((mode) => normalizeLearnerMode(mode))
    : [normalizeLearnerMode('revision-mode')];

  const preferences = isObject(source.preferences) ? source.preferences : {};

  return {
    learningLevel: learningLevel.level,
    knownLearningLevel: learningLevel.known,
    learnerModes: learnerModes.map((entry) => entry.mode),
    unknownLearnerModes: learnerModes.filter((entry) => !entry.known).map((entry) => entry.mode),
    language: safeString(source.language || preferences.language || 'English') || 'English',
    pacingPreference: clamp(source.pacingPreference ?? preferences.pacing ?? 1, 0.5, 1.6),
    preferences,
    weaknesses: uniqueStrings(asArray(source.weaknesses), 24),
    strengths: uniqueStrings(asArray(source.strengths), 24)
  };
}

function resolveProgressState(input = {}, runtime = {}) {
  const source = isObject(input) ? input : {};
  const adaptiveProgress = runtime?.adaptiveTeachingRuntime?.snapshot?.()?.progress || {};
  const timelineSnapshot = runtime?.timelineScheduler?.snapshot?.() || {};
  const cursor = timelineSnapshot.cursor || {};

  return {
    progressPercent: clamp(source.progressPercent ?? adaptiveProgress.progressPercent ?? (toFiniteNumber(cursor.progress, 0) * 100), 0, 100),
    completedUnits: Math.max(0, toFiniteNumber(source.completedUnits ?? adaptiveProgress.completedUnits, 0)),
    totalUnits: Math.max(1, toFiniteNumber(source.totalUnits ?? adaptiveProgress.totalUnits, 1)),
    mistakes: Math.max(0, toFiniteNumber(source.mistakes, 0)),
    revisionCount: Math.max(0, toFiniteNumber(source.revisionCount, 0)),
    checkpointId: safeString(source.checkpointId || runtime?.timelineSynchronizationRuntime?.getSharedState?.()?.playback?.checkpointId || '') || null,
    interrupted: source.interrupted === true,
    resumeTimeMs: Math.max(0, toFiniteNumber(source.resumeTimeMs, 0))
  };
}

function buildNarrationSegments(lessonGraph = {}, profile = {}, options = {}) {
  const timelineSteps = asArray(lessonGraph.timelineSteps);
  const keyConcepts = uniqueStrings(lessonGraph.keyConcepts, 80);
  const maxSegments = Math.max(1, toFiniteNumber(options.maxNarrationSegments, DEFAULT_AI_TEACHER_ENGINE_CONFIG.maxNarrationSegments));
  const baseLanguage = safeString(profile.language || lessonGraph.language || options.defaultLanguage || 'English') || 'English';

  const segments = timelineSteps.length
    ? timelineSteps.map((step, index) => ({
      id: safeString(step?.id || stableId('narration-segment', index)) || stableId('narration-segment', index),
      order: index + 1,
      text: `Explain ${safeString(step?.title || keyConcepts[index] || 'this lesson step')} in ${baseLanguage}.`,
      timestampMs: Math.max(0, toFiniteNumber(step?.startMs, index * 1000)),
      durationMs: Math.max(400, toFiniteNumber(step?.durationMs, 1200)),
      learningObjective: safeString(step?.title || keyConcepts[index] || 'Understand concept progression') || 'Understand concept progression',
      difficulty: safeString(profile.learningLevel || 'intermediate') || 'intermediate',
      metadata: {
        source: 'universal-ai-teacher-engine',
        mode: profile.learnerModes?.[0] || 'revision-mode'
      }
    }))
    : keyConcepts.map((concept, index) => ({
      id: stableId('narration-segment', index),
      order: index + 1,
      text: `Explain ${concept} with adaptive pacing in ${baseLanguage}.`,
      timestampMs: index * 1000,
      durationMs: 1200,
      learningObjective: concept,
      difficulty: safeString(profile.learningLevel || 'intermediate') || 'intermediate',
      metadata: {
        source: 'universal-ai-teacher-engine',
        mode: profile.learnerModes?.[0] || 'revision-mode'
      }
    }));

  return segments.slice(0, maxSegments);
}

function resolveTeachingActionForContext(index, profile = {}, intent = {}) {
  const sequence = [
    'explain',
    'demonstrate',
    'compare',
    'ask-questions',
    'give-hints',
    'repeat',
    'simplify',
    'deep-dive',
    'summarize',
    'motivate',
    'assess-understanding'
  ];

  const preferred = safeString(intent?.preferredAction || '').toLowerCase();
  if (preferred) {
    const normalized = normalizeTeachingAction(preferred);
    if (normalized.known) {
      return normalized.action;
    }
  }

  if (asArray(profile.learnerModes).includes('weak-learners')) {
    return ['simplify', 'repeat', 'give-hints', 'explain'][index % 4];
  }

  if (asArray(profile.learnerModes).includes('fast-learners')) {
    return ['demonstrate', 'compare', 'ask-questions', 'assess-understanding'][index % 4];
  }

  if (asArray(profile.learnerModes).includes('interview-mode')) {
    return ['deep-dive', 'ask-questions', 'assess-understanding', 'summarize'][index % 4];
  }

  if (asArray(profile.learnerModes).includes('exam-mode')) {
    return ['summarize', 'ask-questions', 'assess-understanding', 'repeat'][index % 4];
  }

  return sequence[index % sequence.length];
}

function buildExplanationSteps(segments = [], profile = {}, intent = {}, options = {}) {
  const maxSteps = Math.max(1, toFiniteNumber(options.maxExplanationSteps, DEFAULT_AI_TEACHER_ENGINE_CONFIG.maxExplanationSteps));

  return segments.map((segment, index) => {
    const teachingAction = resolveTeachingActionForContext(index, profile, intent);
    const normalizedAction = normalizeTeachingAction(teachingAction);

    return {
      id: stableId('teaching-step', index),
      segmentId: segment.id,
      order: index + 1,
      action: normalizedAction.action,
      knownAction: normalizedAction.known,
      title: safeString(segment.learningObjective || `Lesson step ${index + 1}`) || `Lesson step ${index + 1}`,
      instruction: `${normalizedAction.action.replace(/-/g, ' ')}: ${safeString(segment.text || segment.learningObjective || 'Continue teaching')}`,
      pacing: clamp(profile.pacingPreference || 1, 0.5, 1.6),
      difficulty: safeString(profile.learningLevel || 'intermediate') || 'intermediate',
      mode: safeString(asArray(profile.learnerModes)[0] || 'revision-mode') || 'revision-mode',
      timestampMs: Math.max(0, toFiniteNumber(segment.timestampMs, index * 1000)),
      durationMs: Math.max(300, toFiniteNumber(segment.durationMs, 1000))
    };
  }).slice(0, maxSteps);
}

function buildTeachingCues(steps = [], lessonGraph = {}, visualizationStrategy = {}, options = {}) {
  const maxCues = Math.max(1, toFiniteNumber(options.maxCues, DEFAULT_AI_TEACHER_ENGINE_CONFIG.maxCues));
  const cues = [];

  steps.forEach((step, index) => {
    cues.push({
      id: stableId('teaching-cue', index),
      type: 'teaching-cue',
      eventName: 'AITeacherTeachingCue',
      stepId: step.id,
      payload: {
        action: step.action,
        instruction: step.instruction,
        pacing: step.pacing,
        difficulty: step.difficulty
      }
    });

    cues.push({
      id: stableId('visualization-cue', index),
      type: 'visualization-cue',
      eventName: 'AITeacherVisualizationCue',
      stepId: step.id,
      payload: {
        visualizationStyle: safeString(visualizationStrategy?.primaryStrategy?.visualizationStyle || 'adaptive visualization') || 'adaptive visualization',
        interactionLevel: safeString(visualizationStrategy?.primaryStrategy?.interactionLevel || 'guided') || 'guided',
        targetObjectId: asArray(lessonGraph.educationalObjects)[index % Math.max(1, asArray(lessonGraph.educationalObjects).length)]?.id || null
      }
    });

    cues.push({
      id: stableId('interaction-cue', index),
      type: 'interaction-cue',
      eventName: 'AITeacherInteractionCue',
      stepId: step.id,
      payload: {
        prompt: `Interact with concept related to ${step.title}`,
        expectedAction: step.action,
        mode: step.mode
      }
    });
  });

  return cues.slice(0, maxCues);
}

function buildPracticePrompts(steps = [], profile = {}) {
  return steps.slice(0, 24).map((step, index) => ({
    id: stableId('practice-prompt', index),
    stepId: step.id,
    prompt: `Practice task: apply ${step.title} using ${safeString(step.action || 'guided reasoning')}.`,
    difficulty: safeString(profile.learningLevel || 'intermediate') || 'intermediate',
    mode: safeString(step.mode || asArray(profile.learnerModes)[0] || 'revision-mode') || 'revision-mode'
  }));
}

function buildQuizTriggers(steps = [], progress = {}) {
  const baseTrigger = Math.max(1, Math.round(steps.length / 3));
  return steps
    .filter((_, index) => (index + 1) % baseTrigger === 0)
    .slice(0, 12)
    .map((step, index) => ({
      id: stableId('quiz-trigger', index),
      stepId: step.id,
      triggerAtStepOrder: step.order,
      progressPercent: clamp(progress.progressPercent, 0, 100),
      prompt: `Quiz checkpoint after ${step.title}`
    }));
}

function buildReflectionPrompts(steps = [], profile = {}) {
  return steps.slice(0, 18).map((step, index) => ({
    id: stableId('reflection-prompt', index),
    stepId: step.id,
    prompt: `Reflect: what changed in your understanding of ${step.title}?`,
    mode: safeString(asArray(profile.learnerModes)[0] || 'revision-mode') || 'revision-mode'
  }));
}

function buildCheckpoints(steps = [], progress = {}) {
  if (!steps.length) return [];

  const chunk = Math.max(1, Math.round(steps.length / 4));
  const checkpoints = [];
  for (let index = 0; index < steps.length; index += chunk) {
    const step = steps[index];
    checkpoints.push({
      id: stableId('teaching-checkpoint', checkpoints.length),
      stepId: step.id,
      order: step.order,
      resumeTimeMs: step.timestampMs,
      progressPercent: clamp(progress.progressPercent, 0, 100)
    });
  }
  return checkpoints.slice(0, 16);
}

function buildRevisionPrompts(steps = [], progress = {}, profile = {}) {
  const shouldEmphasizeRevision = asArray(profile.learnerModes).includes('revision-mode') || toFiniteNumber(progress.revisionCount, 0) > 0 || toFiniteNumber(progress.mistakes, 0) > 0;

  if (!shouldEmphasizeRevision) {
    return steps.slice(-3).map((step, index) => ({
      id: stableId('revision-prompt', index),
      stepId: step.id,
      prompt: `Quick revision: summarize ${step.title}.`
    }));
  }

  return steps.slice(-8).map((step, index) => ({
    id: stableId('revision-prompt', index),
    stepId: step.id,
    prompt: `Revision focus: revisit ${step.title} and explain one practical example.`
  }));
}

function buildTeachingPlan({ lessonGraph, timeline, runtimeGraph, learningIntent, visualizationStrategy, userProfile, progressState }) {
  const narrationSegments = buildNarrationSegments(lessonGraph, userProfile, {
    defaultLanguage: learningIntent.language
  });
  const explanationSteps = buildExplanationSteps(narrationSegments, userProfile, learningIntent, {});
  const allCues = buildTeachingCues(explanationSteps, lessonGraph, visualizationStrategy, {});

  const teachingCues = allCues.filter((cue) => cue.type === 'teaching-cue');
  const visualizationCues = allCues.filter((cue) => cue.type === 'visualization-cue');
  const interactionCues = allCues.filter((cue) => cue.type === 'interaction-cue');
  const practicePrompts = buildPracticePrompts(explanationSteps, userProfile);
  const quizTriggers = buildQuizTriggers(explanationSteps, progressState);
  const reflectionPrompts = buildReflectionPrompts(explanationSteps, userProfile);
  const checkpoints = buildCheckpoints(explanationSteps, progressState);
  const revisionPrompts = buildRevisionPrompts(explanationSteps, progressState, userProfile);

  return {
    schemaVersion: UNIVERSAL_AI_TEACHER_SCHEMA_VERSION,
    lessonId: safeString(lessonGraph.lessonId || timeline.timelineId || 'runtime-lesson') || 'runtime-lesson',
    title: safeString(lessonGraph.title || 'Universal AI Teacher Plan') || 'Universal AI Teacher Plan',
    language: safeString(userProfile.language || learningIntent.language || lessonGraph.language || 'English') || 'English',
    learningLevel: safeString(userProfile.learningLevel || 'intermediate') || 'intermediate',
    learnerModes: uniqueStrings(userProfile.learnerModes, 24),
    pacing: clamp(userProfile.pacingPreference || 1, 0.5, 1.6),
    objectives: uniqueStrings(lessonGraph.learningObjectives, 24),
    timeline: {
      timelineId: safeString(timeline.timelineId || ''),
      version: safeString(timeline.version || 'v2') || 'v2',
      stepCount: explanationSteps.length,
      checkpointCount: checkpoints.length
    },
    runtimeGraph: {
      nodeCount: Math.max(0, toFiniteNumber(runtimeGraph.nodeCount, 0)),
      relationshipCount: Math.max(0, toFiniteNumber(runtimeGraph.relationshipCount, 0))
    },
    narrationSegments,
    explanationSteps,
    teachingCues,
    visualizationCues,
    interactionCues,
    practicePrompts,
    quizTriggers,
    reflectionPrompts,
    checkpoints,
    revisionPrompts,
    diagnostics: {
      generatedAt: Date.now(),
      unknownLearningLevel: userProfile.knownLearningLevel === false,
      unknownLearnerModes: uniqueStrings(userProfile.unknownLearnerModes, 24),
      unknownTeachingActions: uniqueStrings(explanationSteps.filter((step) => step.knownAction === false).map((step) => step.action), 24)
    }
  };
}

export function validateUniversalAITeacherPlan(plan = {}) {
  const source = isObject(plan) ? plan : {};
  const errors = [];
  const warnings = [];

  if (!safeString(source.lessonId)) errors.push('Missing lessonId.');
  if (!safeString(source.title)) errors.push('Missing teaching plan title.');
  if (!Array.isArray(source.narrationSegments)) errors.push('narrationSegments must be an array.');
  if (!Array.isArray(source.explanationSteps)) errors.push('explanationSteps must be an array.');
  if (!Array.isArray(source.teachingCues)) errors.push('teachingCues must be an array.');
  if (!Array.isArray(source.visualizationCues)) errors.push('visualizationCues must be an array.');
  if (!Array.isArray(source.interactionCues)) errors.push('interactionCues must be an array.');
  if (!Array.isArray(source.practicePrompts)) errors.push('practicePrompts must be an array.');
  if (!Array.isArray(source.quizTriggers)) errors.push('quizTriggers must be an array.');
  if (!Array.isArray(source.reflectionPrompts)) errors.push('reflectionPrompts must be an array.');
  if (!Array.isArray(source.checkpoints)) errors.push('checkpoints must be an array.');
  if (!Array.isArray(source.revisionPrompts)) errors.push('revisionPrompts must be an array.');

  const serialized = JSON.stringify(source);
  if (/speechsynthesis|texttospeech|tts|three\.|webgl|rendererpayload/i.test(serialized)) {
    errors.push('Forbidden output payload detected: AI Teacher must remain runtime-event-only and renderer-agnostic.');
  }

  asArray(source.explanationSteps).forEach((step) => {
    const normalized = normalizeTeachingAction(step?.action);
    if (!normalized.known) {
      warnings.push(`Unknown teaching action preserved: ${normalized.action}`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    status: errors.length === 0 ? (warnings.length ? 'warning' : 'valid') : 'invalid'
  };
}

export function serializeUniversalAITeacherPlan(plan = {}) {
  return JSON.stringify({
    schemaVersion: UNIVERSAL_AI_TEACHER_SCHEMA_VERSION,
    serializedAt: Date.now(),
    plan
  });
}

export function migrateUniversalAITeacherPlan(input = {}) {
  const source = isObject(input) ? input : {};

  if (safeString(source.schemaVersion) === UNIVERSAL_AI_TEACHER_SCHEMA_VERSION && isObject(source.timeline) && Array.isArray(source.explanationSteps)) {
    return source;
  }

  return {
    schemaVersion: UNIVERSAL_AI_TEACHER_SCHEMA_VERSION,
    lessonId: safeString(source.lessonId || source.id || 'legacy-lesson') || 'legacy-lesson',
    title: safeString(source.title || source.lessonTitle || 'Legacy Teaching Plan') || 'Legacy Teaching Plan',
    language: safeString(source.language || 'English') || 'English',
    learningLevel: normalizeLearningLevel(source.learningLevel || source.level || 'intermediate').level,
    learnerModes: uniqueStrings(asArray(source.learnerModes).concat(asArray(source.modes)), 24),
    pacing: clamp(source.pacing ?? 1, 0.5, 1.6),
    objectives: uniqueStrings(asArray(source.objectives).concat(asArray(source.learningObjectives)), 24),
    timeline: {
      timelineId: safeString(source?.timeline?.timelineId || source?.timelineId || ''),
      version: safeString(source?.timeline?.version || source?.version || 'v2') || 'v2',
      stepCount: asArray(source.explanationSteps || source.steps).length,
      checkpointCount: asArray(source.checkpoints).length
    },
    runtimeGraph: {
      nodeCount: Math.max(0, toFiniteNumber(source?.runtimeGraph?.nodeCount, 0)),
      relationshipCount: Math.max(0, toFiniteNumber(source?.runtimeGraph?.relationshipCount, 0))
    },
    narrationSegments: asArray(source.narrationSegments),
    explanationSteps: asArray(source.explanationSteps || source.steps),
    teachingCues: asArray(source.teachingCues),
    visualizationCues: asArray(source.visualizationCues),
    interactionCues: asArray(source.interactionCues),
    practicePrompts: asArray(source.practicePrompts),
    quizTriggers: asArray(source.quizTriggers),
    reflectionPrompts: asArray(source.reflectionPrompts),
    checkpoints: asArray(source.checkpoints),
    revisionPrompts: asArray(source.revisionPrompts),
    diagnostics: isObject(source.diagnostics) ? source.diagnostics : {}
  };
}

export function deserializeUniversalAITeacherPlan(payload = '') {
  const parsed = parsePayload(payload);
  if (!parsed) {
    const fallback = migrateUniversalAITeacherPlan({
      title: 'Recovered AI Teacher Plan',
      lessonId: 'recovered-lesson-plan',
      explanationSteps: []
    });
    return {
      plan: fallback,
      validation: {
        valid: false,
        status: 'fallback',
        errors: ['Failed to parse AI Teacher plan payload.'],
        warnings: []
      }
    };
  }

  const plan = migrateUniversalAITeacherPlan(parsed.plan || parsed);
  return {
    plan,
    validation: validateUniversalAITeacherPlan(plan)
  };
}

function createDefaultState() {
  return {
    schemaVersion: UNIVERSAL_AI_TEACHER_SCHEMA_VERSION,
    status: 'Ready',
    plan: null,
    diagnostics: {
      runs: 0,
      recoveries: 0,
      persistedSessions: 0,
      emittedEvents: 0,
      warnings: []
    },
    recovery: {
      interrupted: false,
      checkpointId: null,
      resumeTimeMs: 0,
      resumeCount: 0
    },
    analytics: {
      totalStepsEmitted: 0,
      totalCheckpoints: 0,
      totalPracticePrompts: 0,
      totalQuizTriggers: 0,
      totalRevisionPrompts: 0
    },
    history: {
      recentEvents: []
    }
  };
}

function appendRecentHistory(state = {}, entry = {}, limit = DEFAULT_AI_TEACHER_ENGINE_CONFIG.maxHistory) {
  const recent = asArray(state?.history?.recentEvents);
  recent.push(entry);
  while (recent.length > limit) {
    recent.shift();
  }
  state.history.recentEvents = recent;
}

export class UniversalAITeacherEngine {
  constructor(runtime = {}, options = {}) {
    this.runtime = runtime;
    this.options = {
      ...DEFAULT_AI_TEACHER_ENGINE_CONFIG,
      ...(isObject(options) ? options : {})
    };

    this.scheduler = runtime?.timelineScheduler || runtime?.sceneScheduler || null;
    this.sceneEventRuntime = runtime?.sceneEventRuntime || runtime?.sceneEventSystem || null;
    this.adaptiveTeachingRuntime = runtime?.adaptiveTeachingRuntime || null;
    this.interactionContractRuntime = runtime?.interactionContractRuntime || null;
    this.timelineSynchronizationRuntime = runtime?.timelineSynchronizationRuntime || null;

    this.persistenceAdapter = this.options.persistenceAdapter || this.scheduler?.persistenceAdapter || createDefaultPersistenceAdapter();
    this.persistenceKey = safeString(this.options.persistenceKey || DEFAULT_AI_TEACHER_ENGINE_CONFIG.persistenceKey) || DEFAULT_AI_TEACHER_ENGINE_CONFIG.persistenceKey;

    this.listeners = createChannelSet();
    this.unsubscribers = [];
    this.state = createDefaultState();

    this.attachScheduler(this.scheduler);
    this.attachSceneEvents(this.sceneEventRuntime);

    this.recoverSession();
  }

  on(channel, listener) {
    const safeChannel = safeString(channel) || '*';
    if (typeof listener !== 'function') {
      throw new Error('UniversalAITeacherEngine listener must be a function.');
    }

    if (!this.listeners.has(safeChannel)) {
      this.listeners.set(safeChannel, new Set());
    }

    this.listeners.get(safeChannel).add(listener);
    return () => this.off(safeChannel, listener);
  }

  off(channel, listener) {
    const safeChannel = safeString(channel) || '*';
    const listeners = this.listeners.get(safeChannel);
    if (!listeners) return false;
    return listeners.delete(listener);
  }

  emit(channel, payload = {}) {
    const safeChannel = safeString(channel) || 'ai-teacher-event';
    const message = {
      channel: safeChannel,
      payload,
      state: this.snapshot(),
      timestamp: Date.now()
    };

    safeEmit(this.listeners, safeChannel, message);
    safeEmit(this.listeners, '*', message);
    return message;
  }

  emitRuntimeGraphEvent(eventName = 'AITeacherEvent', payload = {}) {
    const normalizedEventName = safeString(eventName) || 'AITeacherEvent';
    const eventPayload = {
      aiTeacher: {
        schemaVersion: UNIVERSAL_AI_TEACHER_SCHEMA_VERSION,
        eventName: normalizedEventName,
        payload,
        sceneId: this.runtime?.sceneId || null
      }
    };

    const event = {
      id: `ai-teacher-event-${Date.now()}-${Math.round(Math.random() * 1000)}`,
      type: 'ai-teacher-runtime-event',
      timeMs: Math.max(0, toFiniteNumber(this.scheduler?.snapshot?.()?.clock?.timeMs, 0)),
      payload: eventPayload,
      sourceRefId: normalizedEventName,
      source: 'ai-teacher-engine'
    };

    this.sceneEventRuntime?.dispatchEvent?.(event, {
      trigger: 'ai-teacher-runtime',
      synthetic: true
    });

    this.state.diagnostics.emittedEvents += 1;
    appendRecentHistory(this.state, {
      type: 'runtime-graph-event',
      eventName: normalizedEventName,
      emittedAt: Date.now()
    }, this.options.maxHistory);

    this.emit('ai-teacher-runtime-event', {
      eventName: normalizedEventName,
      payload
    });
  }

  attachScheduler(scheduler) {
    if (!scheduler || typeof scheduler.on !== 'function') return;

    const unsubscribe = scheduler.on('*', ({ name = '', payload = {} }) => {
      const eventName = safeString(name);
      if (!eventName) return;

      if (eventName === 'TimelinePaused') {
        this.state.recovery.interrupted = true;
      }

      if (eventName === 'TimelineResumed') {
        this.state.recovery.interrupted = false;
      }

      if (eventName === 'CheckpointReached') {
        this.state.recovery.checkpointId = safeString(payload?.checkpointId || this.state.recovery.checkpointId) || this.state.recovery.checkpointId;
        this.state.recovery.resumeTimeMs = Math.max(0, toFiniteNumber(payload?.timeMs, this.state.recovery.resumeTimeMs));
      }

      if (['TimelinePaused', 'TimelineResumed', 'CheckpointReached', 'TimelineStarted', 'TimelineCompleted'].includes(eventName)) {
        this.emitRuntimeGraphEvent('AITeacherTimelineSignal', {
          name: eventName,
          payload
        });
      }
    });

    this.unsubscribers.push(unsubscribe);
  }

  attachSceneEvents(sceneEventRuntime) {
    if (!sceneEventRuntime || typeof sceneEventRuntime.on !== 'function') return;

    const unsubscribe = sceneEventRuntime.on('SceneEventDispatched', ({ event }) => {
      const source = safeString(event?.source || '');
      if (source === 'ai-teacher-engine') return;

      const type = safeString(event?.type || 'unknown');
      if (type.includes('interaction') || type.includes('quiz') || type.includes('checkpoint')) {
        appendRecentHistory(this.state, {
          type: 'scene-runtime-event',
          eventType: type,
          observedAt: Date.now()
        }, this.options.maxHistory);
      }
    });

    this.unsubscribers.push(unsubscribe);
  }

  createPlan(input = {}) {
    const lessonGraph = isObject(input.lessonGraph) ? input.lessonGraph : getLessonGraph(this.runtime);
    const runtimeGraph = isObject(input.runtimeGraph) ? input.runtimeGraph : getRuntimeGraphSummary(this.runtime);
    const timeline = isObject(input.timeline) ? input.timeline : getTimelineSummary(this.runtime);
    const learningIntent = resolveLearningIntent(this.runtime, input.learningIntent || {});
    const visualizationStrategy = resolveVisualizationStrategy(this.runtime, input.visualizationStrategy || {});
    const userLearningProfile = resolveUserLearningProfile(input.userLearningProfile || {});
    const adaptiveSnapshot = this.adaptiveTeachingRuntime?.snapshot?.() || {};

    if (adaptiveSnapshot?.modeProfile?.mode) {
      const adaptiveMode = normalizeLearnerMode(adaptiveSnapshot.modeProfile.mode);
      if (!userLearningProfile.learnerModes.includes(adaptiveMode.mode)) {
        userLearningProfile.learnerModes.push(adaptiveMode.mode);
        if (!adaptiveMode.known) {
          userLearningProfile.unknownLearnerModes.push(adaptiveMode.mode);
        }
      }
    }

    const progressState = resolveProgressState(input.progressState || {}, this.runtime);

    const teachingPlan = buildTeachingPlan({
      lessonGraph,
      timeline,
      runtimeGraph,
      learningIntent,
      visualizationStrategy,
      userProfile: userLearningProfile,
      progressState
    });

    const validation = validateUniversalAITeacherPlan(teachingPlan);

    this.state.plan = teachingPlan;
    this.state.status = validation.valid ? 'Ready' : 'Warning';
    this.state.diagnostics.runs += 1;
    this.state.analytics.totalStepsEmitted += asArray(teachingPlan.explanationSteps).length;
    this.state.analytics.totalCheckpoints += asArray(teachingPlan.checkpoints).length;
    this.state.analytics.totalPracticePrompts += asArray(teachingPlan.practicePrompts).length;
    this.state.analytics.totalQuizTriggers += asArray(teachingPlan.quizTriggers).length;
    this.state.analytics.totalRevisionPrompts += asArray(teachingPlan.revisionPrompts).length;

    validation.warnings.forEach((warning) => {
      this.state.diagnostics.warnings.push(warning);
    });
    while (this.state.diagnostics.warnings.length > this.options.maxHistory) {
      this.state.diagnostics.warnings.shift();
    }

    const diagnostics = {
      validation,
      runtimeGraph,
      timeline,
      learningIntent,
      visualizationStrategy,
      userLearningProfile,
      progressState,
      generatedAt: Date.now()
    };

    this.runtime.metadata = {
      ...(this.runtime.metadata || {}),
      aiTeacherAdapter: {
        ...(this.runtime.metadata?.aiTeacherAdapter || {}),
        teachingPlan,
        diagnostics,
        adaptiveLearningState: adaptiveSnapshot,
        timelineState: this.timelineSynchronizationRuntime?.getSharedState?.()?.adapters?.aiTeacher || this.runtime.metadata?.aiTeacherAdapter?.timelineState || {}
      }
    };

    this.emitRuntimeGraphEvent('AITeacherPlanGenerated', {
      lessonId: teachingPlan.lessonId,
      title: teachingPlan.title,
      explanationStepCount: asArray(teachingPlan.explanationSteps).length,
      checkpointCount: asArray(teachingPlan.checkpoints).length,
      mode: teachingPlan.learnerModes?.[0] || 'revision-mode',
      level: teachingPlan.learningLevel
    });

    asArray(teachingPlan.teachingCues).forEach((cue) => {
      this.emitRuntimeGraphEvent(cue.eventName, cue.payload);
    });

    asArray(teachingPlan.visualizationCues).forEach((cue) => {
      this.emitRuntimeGraphEvent(cue.eventName, cue.payload);
    });

    asArray(teachingPlan.interactionCues).forEach((cue) => {
      this.emitRuntimeGraphEvent(cue.eventName, cue.payload);
    });

    asArray(teachingPlan.quizTriggers).forEach((trigger) => {
      this.emitRuntimeGraphEvent('AITeacherQuizTrigger', trigger);
    });

    asArray(teachingPlan.checkpoints).forEach((checkpoint) => {
      this.emitRuntimeGraphEvent('AITeacherCheckpoint', checkpoint);
    });

    this.persistSession();

    return {
      teachingPlan,
      validation,
      diagnostics
    };
  }

  synchronize(reason = 'manual', input = {}) {
    const result = this.createPlan(input);
    this.emit('ai-teacher-synchronized', {
      reason,
      result
    });
    return this.snapshot();
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

    if (safeType.includes('seek') || safeType.includes('checkpoint')) {
      this.state.recovery.resumeTimeMs = Math.max(0, toFiniteNumber(this.scheduler?.snapshot?.()?.clock?.timeMs, this.state.recovery.resumeTimeMs));
    }

    this.emitRuntimeGraphEvent('AITeacherTimelineMutation', {
      mutationType: safeType,
      context
    });

    return this.synchronize(`mutation:${safeType}`, {
      progressState: {
        interrupted: this.state.recovery.interrupted,
        checkpointId: this.state.recovery.checkpointId,
        resumeTimeMs: this.state.recovery.resumeTimeMs
      }
    });
  }

  markInterrupted(reason = 'interrupted') {
    this.state.recovery.interrupted = true;
    this.state.status = 'Paused';
    this.state.recovery.resumeTimeMs = Math.max(0, toFiniteNumber(this.scheduler?.snapshot?.()?.clock?.timeMs, this.state.recovery.resumeTimeMs));

    this.emitRuntimeGraphEvent('AITeacherInterrupted', {
      reason,
      resumeTimeMs: this.state.recovery.resumeTimeMs
    });

    this.persistSession();
    return true;
  }

  resumeFromCheckpoint(checkpointId = null) {
    const normalizedCheckpointId = safeString(checkpointId || this.state.recovery.checkpointId || '') || null;
    this.state.recovery.checkpointId = normalizedCheckpointId;
    this.state.recovery.interrupted = false;
    this.state.status = 'Ready';
    this.state.recovery.resumeCount += 1;

    if (normalizedCheckpointId && this.timelineSynchronizationRuntime?.resumeFromCheckpoint) {
      this.timelineSynchronizationRuntime.resumeFromCheckpoint(normalizedCheckpointId);
    }

    this.emitRuntimeGraphEvent('AITeacherResumed', {
      checkpointId: normalizedCheckpointId,
      resumeCount: this.state.recovery.resumeCount
    });

    return this.synchronize('resume-from-checkpoint', {
      progressState: {
        checkpointId: normalizedCheckpointId,
        interrupted: false,
        resumeTimeMs: this.state.recovery.resumeTimeMs
      }
    });
  }

  persistSession(adapter = this.persistenceAdapter) {
    if (!adapter) return false;

    const payload = JSON.stringify({
      schemaVersion: UNIVERSAL_AI_TEACHER_SCHEMA_VERSION,
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
    this.emit('ai-teacher-persisted', {
      persistenceKey: this.persistenceKey
    });
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

    this.state = {
      ...createDefaultState(),
      ...parsed.state,
      diagnostics: {
        ...createDefaultState().diagnostics,
        ...(isObject(parsed?.state?.diagnostics) ? parsed.state.diagnostics : {}),
        recoveries: Math.max(0, toFiniteNumber(parsed?.state?.diagnostics?.recoveries, 0)) + 1
      },
      recovery: {
        ...createDefaultState().recovery,
        ...(isObject(parsed?.state?.recovery) ? parsed.state.recovery : {}),
        interrupted: true
      }
    };

    this.emitRuntimeGraphEvent('AITeacherRecovered', {
      persistenceKey: this.persistenceKey,
      interrupted: true
    });

    this.emit('ai-teacher-recovered', {
      persistenceKey: this.persistenceKey
    });

    return true;
  }

  snapshot() {
    const state = deepClone(this.state);
    state.supportedTeachingActions = [...SUPPORTED_TEACHING_ACTIONS];
    state.supportedLearningLevels = [...SUPPORTED_LEARNING_LEVELS];
    state.supportedLearnerModes = [...SUPPORTED_LEARNER_MODES];
    return state;
  }

  destroy() {
    this.persistSession();

    this.unsubscribers.forEach((unsubscribe) => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    });
    this.unsubscribers = [];

    this.emit('ai-teacher-destroyed', {
      sceneId: this.runtime?.sceneId || null
    });
  }

  static supportedChannels() {
    return [
      'ai-teacher-runtime-event',
      'ai-teacher-synchronized',
      'ai-teacher-persisted',
      'ai-teacher-recovered',
      'ai-teacher-destroyed'
    ];
  }
}

export function createUniversalAITeacherEngine(runtime = {}, options = {}) {
  return new UniversalAITeacherEngine(runtime, options);
}

export function runUniversalAITeacherEngine(runtime = {}, input = {}, options = {}) {
  const engine = createUniversalAITeacherEngine(runtime, options);
  return engine.createPlan(input);
}
