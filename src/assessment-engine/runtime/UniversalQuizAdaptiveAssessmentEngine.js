import {
  UNIVERSAL_ASSESSMENT_SCHEMA_VERSION,
  SUPPORTED_QUESTION_TYPES,
  SUPPORTED_ASSESSMENT_MODES,
  SUPPORTED_DIFFICULTY_LEVELS,
  DEFAULT_UNIVERSAL_ASSESSMENT_CONFIG,
  isObject,
  asArray,
  safeString,
  toFiniteNumber,
  clamp,
  normalizeQuestionType,
  normalizeAssessmentMode,
  normalizeDifficultyLevel
} from './UniversalQuizAdaptiveAssessmentEngineConfig.js';

const STORE_KEY = '__daksha_universal_assessment_engine_store__';

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
      // Listener failures are isolated from assessment runtime.
    }
  });
}

function uniqueStrings(values = [], max = 120) {
  const output = [];
  const seen = new Set();

  asArray(values).forEach((value) => {
    const text = safeString(value);
    if (!text) return;
    const key = text.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    output.push(text);
  });

  return output.slice(0, max);
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
    nodeCount: Math.max(0, toFiniteNumber(graph?.getNodeCount?.(), graph?.nodes?.size || 0)),
    relationshipCount: Math.max(0, toFiniteNumber(graph?.getRelationshipCount?.(), asArray(graph?.edges).length))
  };
}

function getTimelineSummary(runtime = {}) {
  const timeline = runtime?.metadata?.timeline || runtime?.sceneJson?.timeline || {};
  return {
    timelineId: safeString(timeline.timelineId || runtime?.sceneId || ''),
    version: safeString(timeline.version || 'v2') || 'v2',
    clipIds: asArray(timeline.clipIds),
    markerIds: asArray(timeline.markerIds),
    eventIds: asArray(timeline.eventIds)
  };
}

function getLessonGraph(runtime = {}, input = {}) {
  const direct = isObject(input.lessonGraph) ? input.lessonGraph : null;
  if (direct) return direct;
  const metadataGraph = runtime?.metadata?.lessonGraph;
  if (isObject(metadataGraph)) return metadataGraph;

  return {
    schemaVersion: 'v1',
    lessonId: safeString(runtime?.sceneId || 'runtime-lesson') || 'runtime-lesson',
    title: safeString(runtime?.metadata?.title || 'Runtime Lesson') || 'Runtime Lesson',
    language: safeString(runtime?.metadata?.language || 'English') || 'English',
    learningObjectives: uniqueStrings(asArray(runtime?.metadata?.learningObjectives), 24),
    keyConcepts: uniqueStrings(asArray(runtime?.metadata?.keyConcepts), 60),
    timelineSteps: asArray(runtime?.metadata?.timelineData?.clips).map((clip, index) => ({
      id: safeString(clip?.id || `step-${index + 1}`) || `step-${index + 1}`,
      title: safeString(clip?.metadata?.title || clip?.id || `Step ${index + 1}`) || `Step ${index + 1}`,
      order: index + 1,
      startMs: Math.max(0, toFiniteNumber(clip?.start, index * 1000)),
      endMs: Math.max(0, toFiniteNumber(clip?.end, (index + 1) * 1000)),
      durationMs: Math.max(0, toFiniteNumber(clip?.duration, 1000))
    })),
    educationalObjects: []
  };
}

function resolveLearningObjectives(lessonGraph = {}, input = {}) {
  const direct = asArray(input.learningObjectives);
  if (direct.length) return uniqueStrings(direct, 60);

  const fromGraph = asArray(lessonGraph.learningObjectives);
  if (fromGraph.length) return uniqueStrings(fromGraph, 60);

  return uniqueStrings([
    safeString(lessonGraph.title || 'Understand lesson concepts')
  ], 60);
}

function resolveUserProfile(input = {}, runtime = {}) {
  const source = isObject(input.userLearningProfile) ? input.userLearningProfile : {};
  const difficulty = normalizeDifficultyLevel(source.learningLevel || source.level || source.difficulty || 'intermediate');
  const modeSource = uniqueStrings([
    ...asArray(source.modes),
    ...asArray(source.assessmentModes),
    ...asArray(source.learnerModes),
    source.mode
  ], 20).filter(Boolean);

  const normalizedModes = (modeSource.length ? modeSource : ['practice-mode']).map((value) => normalizeAssessmentMode(value));

  return {
    learningLevel: difficulty.level,
    knownLearningLevel: difficulty.known,
    language: safeString(source.language || runtime?.metadata?.language || 'English') || 'English',
    modes: normalizedModes.map((entry) => entry.mode),
    unknownModes: normalizedModes.filter((entry) => !entry.known).map((entry) => entry.mode),
    confidence: clamp(source.confidence ?? source.learningConfidence ?? 0.6, 0, 1),
    learningPace: clamp(source.learningPace ?? source.pace ?? 1, 0.4, 1.8),
    weakConcepts: uniqueStrings(asArray(source.weakConcepts), 40),
    revisionHistory: asArray(source.revisionHistory)
  };
}

function resolveProgressState(input = {}, runtime = {}) {
  const source = isObject(input.progressState) ? input.progressState : {};
  const adaptiveProgress = runtime?.adaptiveTeachingRuntime?.snapshot?.()?.progress || {};
  const timelineSnapshot = runtime?.timelineScheduler?.snapshot?.() || {};
  const cursor = timelineSnapshot.cursor || {};

  return {
    progressPercent: clamp(source.progressPercent ?? adaptiveProgress.progressPercent ?? (toFiniteNumber(cursor.progress, 0) * 100), 0, 100),
    responseSpeed: clamp(source.responseSpeed ?? source.speed ?? 0.65, 0, 1),
    accuracy: clamp(source.accuracy ?? source.completionScore ?? 0.6, 0, 1),
    mistakes: Math.max(0, toFiniteNumber(source.mistakes, 0)),
    previousAttempts: Math.max(0, toFiniteNumber(source.previousAttempts, 0)),
    weakConcepts: uniqueStrings(asArray(source.weakConcepts), 40),
    learningPace: clamp(source.learningPace ?? 1, 0.4, 1.8),
    revisionHistory: asArray(source.revisionHistory),
    checkpointId: safeString(source.checkpointId || runtime?.timelineSynchronizationRuntime?.getSharedState?.()?.playback?.checkpointId || '') || null
  };
}

function resolveAITeacherMetadata(input = {}, runtime = {}) {
  const source = isObject(input.aiTeacherMetadata) ? input.aiTeacherMetadata : {};
  const adapter = runtime?.metadata?.aiTeacherAdapter || {};

  return {
    teachingPlan: source.teachingPlan || adapter.teachingPlan || null,
    diagnostics: source.diagnostics || adapter.diagnostics || null,
    runtimeState: source.runtimeState || adapter.runtimeState || null,
    timelineState: source.timelineState || adapter.timelineState || null
  };
}

function resolveQuestionTypes(input = {}, profile = {}) {
  const requested = uniqueStrings([
    ...asArray(input.questionTypes),
    ...asArray(input.assessmentTypes)
  ], 40);

  const fallback = SUPPORTED_QUESTION_TYPES;
  const source = requested.length ? requested : fallback;
  const normalized = source.map((value) => normalizeQuestionType(value));

  if (asArray(profile.modes).includes('interview-mode')) {
    normalized.push(normalizeQuestionType('oral-question'));
    normalized.push(normalizeQuestionType('scenario-based'));
  }

  if (asArray(profile.modes).includes('exam-mode')) {
    normalized.push(normalizeQuestionType('mcq'));
    normalized.push(normalizeQuestionType('long-answer'));
  }

  if (asArray(profile.modes).includes('practice-mode')) {
    normalized.push(normalizeQuestionType('fill-in-the-blank'));
    normalized.push(normalizeQuestionType('interactive-object-question'));
  }

  const uniqueNormalized = [];
  const seen = new Set();
  normalized.forEach((entry) => {
    if (seen.has(entry.type)) return;
    seen.add(entry.type);
    uniqueNormalized.push(entry);
  });

  return uniqueNormalized;
}

function pickDifficultyPlan(profile = {}, progress = {}) {
  const base = normalizeDifficultyLevel(profile.learningLevel || 'intermediate');
  let value = base.level;

  const score = clamp((progress.accuracy * 0.5) + (progress.responseSpeed * 0.2) + (profile.confidence * 0.3), 0, 1);
  const struggle = clamp((progress.mistakes / 8) + (progress.previousAttempts / 10), 0, 1);

  if (score >= 0.82 && struggle <= 0.25) {
    value = 'expert';
  } else if (score >= 0.68 && struggle <= 0.4) {
    value = 'advanced';
  } else if (score <= 0.38 || struggle >= 0.7) {
    value = 'beginner';
  } else {
    value = 'intermediate';
  }

  return {
    level: value,
    known: SUPPORTED_DIFFICULTY_LEVELS.includes(value),
    confidenceScore: score,
    struggleScore: struggle,
    rationale: {
      confidence: profile.confidence,
      responseSpeed: progress.responseSpeed,
      accuracy: progress.accuracy,
      mistakes: progress.mistakes,
      previousAttempts: progress.previousAttempts,
      learningPace: progress.learningPace,
      revisionCount: asArray(progress.revisionHistory).length
    }
  };
}

function generateQuestionPrompt(type = 'mcq', objective = '', concept = '', mode = 'practice-mode') {
  const topic = safeString(concept || objective || 'this concept') || 'this concept';
  if (type === 'true-false') return `True or False: ${topic} can be applied in a practical scenario.`;
  if (type === 'fill-in-the-blank') return `Fill in the blank: The key idea behind ${topic} is ____.`;
  if (type === 'multiple-select') return `Select all statements that correctly describe ${topic}.`;
  if (type === 'short-answer') return `In 2 lines, explain ${topic}.`;
  if (type === 'long-answer') return `Write a detailed explanation of ${topic} and include one example.`;
  if (type === 'match-the-following') return `Match each principle to its role in ${topic}.`;
  if (type === 'ordering') return `Arrange the process steps for ${topic} in the correct order.`;
  if (type === 'diagram-labeling') return `Label the important parts related to ${topic}.`;
  if (type === 'code-completion') return `Complete the missing code to demonstrate ${topic}.`;
  if (type === 'scenario-based') return `Scenario: apply ${topic} to solve a realistic problem.`;
  if (type === 'case-study') return `Case Study: evaluate a case where ${topic} impacts outcomes.`;
  if (type === 'simulation') return `Simulation Task: simulate ${topic} and describe the result.`;
  if (type === 'practical-task') return `Practical Task: perform an activity proving ${topic}.`;
  if (type === 'oral-question') return `Oral Question: explain ${topic} verbally in simple terms.`;
  if (type === 'interactive-object-question') return `Use the interactive object to identify ${topic}.`;
  if (type === 'mcq') return `Which option best describes ${topic}?`;

  return `${safeString(type || 'custom-question')}: demonstrate understanding of ${topic} for ${mode}.`;
}

function buildQuestionBank({ objectives = [], concepts = [], questionTypes = [], mode = 'practice-mode', difficultyLevel = 'intermediate', maxQuestionBank = 300 }) {
  const safeObjectives = objectives.length ? objectives : ['Understand key concepts'];
  const safeConcepts = concepts.length ? concepts : safeObjectives;
  const output = [];

  questionTypes.forEach((entry, typeIndex) => {
    const questionType = entry.type;
    safeObjectives.forEach((objective, objectiveIndex) => {
      const concept = safeConcepts[(typeIndex + objectiveIndex) % Math.max(1, safeConcepts.length)];
      output.push({
        id: `question-${typeIndex + 1}-${objectiveIndex + 1}`,
        type: questionType,
        knownType: entry.known,
        objective,
        concept,
        difficultyLevel,
        mode,
        prompt: generateQuestionPrompt(questionType, objective, concept, mode),
        hints: [
          `Hint: connect ${concept} to the core objective.`,
          'Hint: explain the reasoning, not only the final answer.'
        ],
        explanationGuide: `Expected explanation should show conceptual clarity for ${concept}.`,
        scoringWeights: {
          correctness: 0.55,
          reasoning: 0.3,
          clarity: 0.15
        }
      });
    });
  });

  return output.slice(0, Math.max(1, toFiniteNumber(maxQuestionBank, 300)));
}

function buildWeakAreaMap({ concepts = [], weakConcepts = [], questionBank = [], progress = {} }) {
  const weakSet = new Set(uniqueStrings(weakConcepts, 80).map((value) => value.toLowerCase()));
  const conceptPool = uniqueStrings([...concepts, ...weakConcepts], 100);

  return conceptPool.map((concept, index) => {
    const conceptKey = concept.toLowerCase();
    const directlyWeak = weakSet.has(conceptKey);
    const relationScore = questionBank.filter((question) => safeString(question.concept).toLowerCase() === conceptKey).length;
    const mistakeInfluence = Math.min(1, toFiniteNumber(progress.mistakes, 0) / 8);
    const weaknessScore = clamp((directlyWeak ? 0.7 : 0.2) + (relationScore / 10) + (mistakeInfluence * 0.2), 0, 1);

    return {
      id: `weak-area-${index + 1}`,
      concept,
      weaknessScore,
      status: weaknessScore >= 0.65 ? 'weak' : weaknessScore >= 0.45 ? 'moderate' : 'strong'
    };
  });
}

function buildEvaluationRules({ difficultyPlan = {}, mode = 'practice-mode' }) {
  return {
    schemaVersion: UNIVERSAL_ASSESSMENT_SCHEMA_VERSION,
    scoring: {
      correctnessWeight: 0.55,
      reasoningWeight: 0.3,
      clarityWeight: 0.15,
      penaltyForRepeatedMistakes: difficultyPlan.struggleScore >= 0.6 ? 0.08 : 0.03,
      bonusForFastAccurateResponses: difficultyPlan.confidenceScore >= 0.7 ? 0.06 : 0.02
    },
    progression: {
      difficultyEscalationThreshold: 0.78,
      difficultyReductionThreshold: 0.42,
      retryLimit: mode === 'exam-mode' ? 1 : mode === 'certification-mode' ? 1 : 3
    },
    feedback: {
      instantFeedback: true,
      explanationRequired: true,
      hintsEnabled: mode !== 'certification-mode'
    }
  };
}

function computeMasteryMetrics({ progress = {}, weakAreaMap = [], questionBank = [], difficultyPlan = {} }) {
  const weakCount = weakAreaMap.filter((entry) => entry.status === 'weak').length;
  const moderateCount = weakAreaMap.filter((entry) => entry.status === 'moderate').length;

  const masteryScore = clamp(
    (progress.accuracy * 0.45)
      + ((1 - clamp(weakCount / Math.max(1, weakAreaMap.length), 0, 1)) * 0.3)
      + (progress.responseSpeed * 0.1)
      + ((1 - difficultyPlan.struggleScore) * 0.15),
    0,
    1
  );

  const completionScore = clamp(progress.progressPercent / 100, 0, 1);
  const learningConfidence = clamp((difficultyPlan.confidenceScore * 0.7) + (progress.accuracy * 0.3), 0, 1);

  const knowledgeGaps = weakAreaMap
    .filter((entry) => entry.status !== 'strong')
    .map((entry) => ({
      concept: entry.concept,
      severity: entry.status,
      gapScore: entry.weaknessScore
    }));

  const recommendedNextLesson = questionBank.length
    ? `Next lesson should reinforce ${knowledgeGaps[0]?.concept || questionBank[0].concept || 'core concepts'}.`
    : 'Next lesson should reinforce core concepts.';

  return {
    masteryScore,
    completionScore,
    learningConfidence,
    weakCount,
    moderateCount,
    knowledgeGaps,
    recommendedNextLesson
  };
}

function buildFeedbackPlan({ questionBank = [], mode = 'practice-mode', metrics = {} }) {
  return {
    instantFeedback: questionBank.slice(0, 40).map((question, index) => ({
      questionId: question.id,
      feedbackType: 'instant',
      message: `Feedback ${index + 1}: review the rationale for ${question.concept}.`
    })),
    explanations: questionBank.slice(0, 40).map((question) => ({
      questionId: question.id,
      explanation: question.explanationGuide
    })),
    hints: mode === 'certification-mode'
      ? []
      : questionBank.slice(0, 40).map((question) => ({
        questionId: question.id,
        hints: question.hints
      })),
    retryStrategy: {
      maxRetries: mode === 'exam-mode' || mode === 'certification-mode' ? 1 : 3,
      rule: metrics.masteryScore >= 0.8 ? 'retry-hard-questions-only' : 'retry-weak-concept-questions-first'
    }
  };
}

function buildPersonalizedRevisionPlan({ weakAreaMap = [], mode = 'practice-mode', knowledgeGaps = [], language = 'English' }) {
  const prioritized = weakAreaMap
    .slice()
    .sort((left, right) => right.weaknessScore - left.weaknessScore)
    .slice(0, 12);

  return {
    language,
    mode,
    steps: prioritized.map((entry, index) => ({
      id: `revision-step-${index + 1}`,
      concept: entry.concept,
      priority: index + 1,
      action: `Revise ${entry.concept} with guided examples and one practice attempt.`
    })),
    checkpoints: knowledgeGaps.slice(0, 8).map((gap, index) => ({
      id: `revision-checkpoint-${index + 1}`,
      concept: gap.concept,
      target: gap.severity === 'weak' ? 'stabilize-understanding' : 'improve-confidence'
    }))
  };
}

function buildAssessmentPlan(context = {}) {
  const questionDistribution = {};
  const checkpoints = asArray(context.quizCheckpoints);
  asArray(context.questionBank).forEach((question) => {
    const key = safeString(question.type || 'unknown') || 'unknown';
    questionDistribution[key] = (questionDistribution[key] || 0) + 1;
  });

  return {
    schemaVersion: UNIVERSAL_ASSESSMENT_SCHEMA_VERSION,
    mode: context.mode,
    difficultyLevel: context.difficultyPlan.level,
    totalQuestions: asArray(context.questionBank).length,
    estimatedDurationMinutes: Math.max(5, Math.round(asArray(context.questionBank).length * 1.5)),
    timelineBindings: {
      timelineId: safeString(context.timeline.timelineId || ''),
      checkpointCount: checkpoints.length
    },
    questionDistribution,
    adaptivePolicy: {
      confidenceScore: context.difficultyPlan.confidenceScore,
      struggleScore: context.difficultyPlan.struggleScore,
      adaptationEnabled: true,
      reduceDifficultyWhenStruggling: context.difficultyPlan.struggleScore >= 0.6,
      increaseDifficultyWhenConfident: context.difficultyPlan.confidenceScore >= 0.78
    }
  };
}

function buildOutput(context = {}) {
  const mode = context.mode;
  const metrics = context.metrics;

  return {
    schemaVersion: UNIVERSAL_ASSESSMENT_SCHEMA_VERSION,
    lessonId: safeString(context.lessonGraph.lessonId || context.timeline.timelineId || 'runtime-lesson') || 'runtime-lesson',
    title: safeString(context.lessonGraph.title || 'Universal Assessment') || 'Universal Assessment',
    language: safeString(context.userProfile.language || context.lessonGraph.language || 'English') || 'English',
    mode,
    learningLevel: context.userProfile.learningLevel,
    quizBlueprint: {
      schemaVersion: UNIVERSAL_ASSESSMENT_SCHEMA_VERSION,
      mode,
      objectiveCount: asArray(context.objectives).length,
      questionTypeCount: asArray(context.questionTypes).length,
      totalQuestions: asArray(context.questionBank).length,
      checkpoints: asArray(context.quizCheckpoints)
    },
    assessmentPlan: buildAssessmentPlan(context),
    questionBank: context.questionBank,
    adaptiveDifficultyPlan: {
      level: context.difficultyPlan.level,
      confidenceScore: context.difficultyPlan.confidenceScore,
      struggleScore: context.difficultyPlan.struggleScore,
      rationale: context.difficultyPlan.rationale
    },
    evaluationRules: context.evaluationRules,
    feedbackPlan: context.feedbackPlan,
    weakAreaMap: context.weakAreaMap,
    masteryScore: metrics.masteryScore,
    knowledgeGaps: metrics.knowledgeGaps,
    personalizedRevisionPlan: context.personalizedRevisionPlan,
    completionScore: metrics.completionScore,
    learningConfidence: metrics.learningConfidence,
    recommendedNextLesson: metrics.recommendedNextLesson,
    diagnostics: {
      runtimeGraphNodeCount: context.runtimeGraph.nodeCount,
      runtimeGraphRelationshipCount: context.runtimeGraph.relationshipCount,
      timelineId: context.timeline.timelineId,
      unknownAssessmentModes: uniqueStrings(context.userProfile.unknownModes, 30),
      unknownQuestionTypes: uniqueStrings(context.questionTypes.filter((entry) => !entry.known).map((entry) => entry.type), 40),
      generatedAt: Date.now()
    }
  };
}

export function validateUniversalAssessmentOutput(output = {}) {
  const source = isObject(output) ? output : {};
  const errors = [];
  const warnings = [];

  if (!safeString(source.lessonId)) errors.push('Missing lessonId.');
  if (!safeString(source.title)) errors.push('Missing assessment title.');
  if (!isObject(source.quizBlueprint)) errors.push('Missing quizBlueprint.');
  if (!isObject(source.assessmentPlan)) errors.push('Missing assessmentPlan.');
  if (!Array.isArray(source.questionBank)) errors.push('questionBank must be an array.');
  if (!isObject(source.adaptiveDifficultyPlan)) errors.push('Missing adaptiveDifficultyPlan.');
  if (!isObject(source.evaluationRules)) errors.push('Missing evaluationRules.');
  if (!isObject(source.feedbackPlan)) errors.push('Missing feedbackPlan.');
  if (!Array.isArray(source.weakAreaMap)) errors.push('weakAreaMap must be an array.');
  if (!Array.isArray(source.knowledgeGaps)) errors.push('knowledgeGaps must be an array.');
  if (!isObject(source.personalizedRevisionPlan)) errors.push('Missing personalizedRevisionPlan.');

  if (typeof source.masteryScore !== 'number') errors.push('masteryScore must be a number.');
  if (typeof source.completionScore !== 'number') errors.push('completionScore must be a number.');
  if (typeof source.learningConfidence !== 'number') errors.push('learningConfidence must be a number.');
  if (!safeString(source.recommendedNextLesson)) errors.push('Missing recommendedNextLesson.');

  const serialized = JSON.stringify(source);
  if (/three\.|webgl|rendererpayload|speechsynthesis|texttospeech|tts/i.test(serialized)) {
    errors.push('Forbidden rendering or speech payload detected in assessment output.');
  }

  asArray(source.questionBank).forEach((question) => {
    const normalized = normalizeQuestionType(question?.type);
    if (!normalized.known) {
      warnings.push(`Unknown question type preserved: ${normalized.type}`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    status: errors.length === 0 ? (warnings.length ? 'warning' : 'valid') : 'invalid'
  };
}

export function serializeUniversalAssessmentOutput(output = {}) {
  return JSON.stringify({
    schemaVersion: UNIVERSAL_ASSESSMENT_SCHEMA_VERSION,
    serializedAt: Date.now(),
    output
  });
}

export function migrateUniversalAssessmentOutput(input = {}) {
  const source = isObject(input) ? input : {};

  if (safeString(source.schemaVersion) === UNIVERSAL_ASSESSMENT_SCHEMA_VERSION && isObject(source.quizBlueprint)) {
    return source;
  }

  return {
    schemaVersion: UNIVERSAL_ASSESSMENT_SCHEMA_VERSION,
    lessonId: safeString(source.lessonId || source.id || 'legacy-lesson') || 'legacy-lesson',
    title: safeString(source.title || source.lessonTitle || 'Legacy Assessment') || 'Legacy Assessment',
    language: safeString(source.language || 'English') || 'English',
    mode: normalizeAssessmentMode(source.mode || 'practice-mode').mode,
    learningLevel: normalizeDifficultyLevel(source.learningLevel || source.level || 'intermediate').level,
    quizBlueprint: isObject(source.quizBlueprint)
      ? source.quizBlueprint
      : {
        schemaVersion: UNIVERSAL_ASSESSMENT_SCHEMA_VERSION,
        mode: normalizeAssessmentMode(source.mode || 'practice-mode').mode,
        objectiveCount: asArray(source.learningObjectives).length,
        questionTypeCount: asArray(source.questionTypes).length,
        totalQuestions: asArray(source.questionBank || source.questions).length,
        checkpoints: asArray(source.checkpoints)
      },
    assessmentPlan: isObject(source.assessmentPlan) ? source.assessmentPlan : {},
    questionBank: asArray(source.questionBank || source.questions),
    adaptiveDifficultyPlan: isObject(source.adaptiveDifficultyPlan)
      ? source.adaptiveDifficultyPlan
      : {
        level: normalizeDifficultyLevel(source.learningLevel || 'intermediate').level,
        confidenceScore: clamp(source.confidenceScore ?? 0.6, 0, 1),
        struggleScore: clamp(source.struggleScore ?? 0.3, 0, 1),
        rationale: {}
      },
    evaluationRules: isObject(source.evaluationRules) ? source.evaluationRules : {},
    feedbackPlan: isObject(source.feedbackPlan) ? source.feedbackPlan : {},
    weakAreaMap: asArray(source.weakAreaMap),
    masteryScore: clamp(source.masteryScore ?? 0.5, 0, 1),
    knowledgeGaps: asArray(source.knowledgeGaps),
    personalizedRevisionPlan: isObject(source.personalizedRevisionPlan) ? source.personalizedRevisionPlan : { steps: [], checkpoints: [] },
    completionScore: clamp(source.completionScore ?? 0.5, 0, 1),
    learningConfidence: clamp(source.learningConfidence ?? 0.5, 0, 1),
    recommendedNextLesson: safeString(source.recommendedNextLesson || 'Continue with the next adaptive lesson.') || 'Continue with the next adaptive lesson.',
    diagnostics: isObject(source.diagnostics) ? source.diagnostics : {}
  };
}

export function deserializeUniversalAssessmentOutput(payload = '') {
  const parsed = parsePayload(payload);
  if (!parsed) {
    const fallback = migrateUniversalAssessmentOutput({
      title: 'Recovered Assessment',
      lessonId: 'recovered-assessment'
    });
    return {
      output: fallback,
      validation: {
        valid: false,
        status: 'fallback',
        errors: ['Failed to parse assessment payload.'],
        warnings: []
      }
    };
  }

  const output = migrateUniversalAssessmentOutput(parsed.output || parsed);
  return {
    output,
    validation: validateUniversalAssessmentOutput(output)
  };
}

function createDefaultState() {
  return {
    schemaVersion: UNIVERSAL_ASSESSMENT_SCHEMA_VERSION,
    status: 'Ready',
    output: null,
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
      totalQuestions: 0,
      totalWeakAreas: 0,
      averageMasteryScore: 0
    },
    history: {
      recentEvents: []
    }
  };
}

function pushHistory(state = {}, entry = {}, maxHistory = 400) {
  const events = asArray(state?.history?.recentEvents);
  events.push(entry);
  while (events.length > maxHistory) {
    events.shift();
  }
  state.history.recentEvents = events;
}

export class UniversalQuizAdaptiveAssessmentEngine {
  constructor(runtime = {}, options = {}) {
    this.runtime = runtime;
    this.options = {
      ...DEFAULT_UNIVERSAL_ASSESSMENT_CONFIG,
      ...(isObject(options) ? options : {})
    };

    this.scheduler = runtime?.timelineScheduler || runtime?.sceneScheduler || null;
    this.sceneEventRuntime = runtime?.sceneEventRuntime || runtime?.sceneEventSystem || null;
    this.timelineSynchronizationRuntime = runtime?.timelineSynchronizationRuntime || null;
    this.interactionContractRuntime = runtime?.interactionContractRuntime || null;
    this.aiTeacherRuntime = runtime?.aiTeacherRuntime || null;
    this.adaptiveTeachingRuntime = runtime?.adaptiveTeachingRuntime || null;

    this.persistenceAdapter = this.options.persistenceAdapter || this.scheduler?.persistenceAdapter || createDefaultPersistenceAdapter();
    this.persistenceKey = safeString(this.options.persistenceKey || DEFAULT_UNIVERSAL_ASSESSMENT_CONFIG.persistenceKey) || DEFAULT_UNIVERSAL_ASSESSMENT_CONFIG.persistenceKey;

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
      throw new Error('UniversalQuizAdaptiveAssessmentEngine listener must be a function.');
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
    const safeChannel = safeString(channel) || 'assessment-event';
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

  emitRuntimeGraphEvent(eventName = 'AssessmentEvent', payload = {}) {
    const normalizedEventName = safeString(eventName) || 'AssessmentEvent';
    const sceneEvent = {
      id: `assessment-event-${Date.now()}-${Math.round(Math.random() * 1000)}`,
      type: 'assessment-runtime-event',
      timeMs: Math.max(0, toFiniteNumber(this.scheduler?.snapshot?.()?.clock?.timeMs, 0)),
      payload: {
        assessment: {
          schemaVersion: UNIVERSAL_ASSESSMENT_SCHEMA_VERSION,
          eventName: normalizedEventName,
          payload,
          sceneId: this.runtime?.sceneId || null
        }
      },
      sourceRefId: normalizedEventName,
      source: 'assessment-engine'
    };

    this.sceneEventRuntime?.dispatchEvent?.(sceneEvent, {
      trigger: 'assessment-runtime',
      synthetic: true
    });

    this.state.diagnostics.emittedEvents += 1;
    pushHistory(this.state, {
      type: 'runtime-graph-event',
      eventName: normalizedEventName,
      emittedAt: Date.now()
    }, this.options.maxHistory);

    this.emit('assessment-runtime-event', {
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
    });

    this.unsubscribers.push(unsubscribe);
  }

  attachSceneEvents(sceneEventRuntime) {
    if (!sceneEventRuntime || typeof sceneEventRuntime.on !== 'function') return;

    const unsubscribe = sceneEventRuntime.on('SceneEventDispatched', ({ event }) => {
      const source = safeString(event?.source || '');
      if (source === 'assessment-engine') return;

      const type = safeString(event?.type || 'unknown');
      if (type.includes('interaction') || type.includes('quiz') || type.includes('assessment')) {
        pushHistory(this.state, {
          type: 'scene-runtime-event',
          eventType: type,
          observedAt: Date.now()
        }, this.options.maxHistory);
      }
    });

    this.unsubscribers.push(unsubscribe);
  }

  generate(input = {}) {
    const lessonGraph = getLessonGraph(this.runtime, input);
    const runtimeGraph = isObject(input.runtimeGraph) ? input.runtimeGraph : getRuntimeGraphSummary(this.runtime);
    const timeline = isObject(input.timeline) ? input.timeline : getTimelineSummary(this.runtime);
    const objectives = resolveLearningObjectives(lessonGraph, input);
    const userProfile = resolveUserProfile(input, this.runtime);
    const progressState = resolveProgressState(input, this.runtime);
    const aiTeacherMetadata = resolveAITeacherMetadata(input, this.runtime);
    const questionTypes = resolveQuestionTypes(input, userProfile);
    const difficultyPlan = pickDifficultyPlan(userProfile, progressState);

    const mode = normalizeAssessmentMode(asArray(userProfile.modes)[0] || this.options.defaultMode).mode;
    const concepts = uniqueStrings([
      ...asArray(lessonGraph.keyConcepts),
      ...asArray(progressState.weakConcepts),
      ...asArray(userProfile.weakConcepts)
    ], 100);

    const questionBank = buildQuestionBank({
      objectives,
      concepts,
      questionTypes,
      mode,
      difficultyLevel: difficultyPlan.level,
      maxQuestionBank: this.options.maxQuestionBank
    });

    const weakAreaMap = buildWeakAreaMap({
      concepts,
      weakConcepts: uniqueStrings([...progressState.weakConcepts, ...userProfile.weakConcepts], 80),
      questionBank,
      progress: progressState
    });

    const evaluationRules = buildEvaluationRules({
      difficultyPlan,
      mode
    });

    const metrics = computeMasteryMetrics({
      progress: progressState,
      weakAreaMap,
      questionBank,
      difficultyPlan
    });

    const feedbackPlan = buildFeedbackPlan({
      questionBank,
      mode,
      metrics
    });

    const quizCheckpoints = asArray(lessonGraph.timelineSteps)
      .slice(0, 16)
      .map((step, index) => ({
        id: `quiz-checkpoint-${index + 1}`,
        stepId: safeString(step?.id || `step-${index + 1}`) || `step-${index + 1}`,
        order: index + 1,
        checkpointType: index % 2 === 0 ? 'formative' : 'summative'
      }));

    const personalizedRevisionPlan = buildPersonalizedRevisionPlan({
      weakAreaMap,
      mode,
      knowledgeGaps: metrics.knowledgeGaps,
      language: userProfile.language
    });

    const output = buildOutput({
      lessonGraph,
      runtimeGraph,
      timeline,
      aiTeacherMetadata,
      objectives,
      userProfile,
      progress: progressState,
      progressState,
      mode,
      questionTypes,
      questionBank,
      weakAreaMap,
      difficultyPlan,
      evaluationRules,
      feedbackPlan,
      metrics,
      personalizedRevisionPlan,
      quizCheckpoints
    });

    const validation = validateUniversalAssessmentOutput(output);

    this.state.output = output;
    this.state.status = validation.valid ? 'Ready' : 'Warning';
    this.state.diagnostics.runs += 1;
    this.state.analytics.totalQuestions += asArray(output.questionBank).length;
    this.state.analytics.totalWeakAreas += asArray(output.weakAreaMap).length;

    const previousRuns = Math.max(1, this.state.diagnostics.runs);
    this.state.analytics.averageMasteryScore = clamp(
      ((this.state.analytics.averageMasteryScore * (previousRuns - 1)) + output.masteryScore) / previousRuns,
      0,
      1
    );

    validation.warnings.forEach((warning) => {
      this.state.diagnostics.warnings.push(warning);
    });
    while (this.state.diagnostics.warnings.length > this.options.maxHistory) {
      this.state.diagnostics.warnings.shift();
    }

    this.runtime.metadata = {
      ...(this.runtime.metadata || {}),
      assessmentAdapter: {
        ...(this.runtime.metadata?.assessmentAdapter || {}),
        output,
        validation,
        runtimeState: this.snapshot(),
        aiTeacherMetadata,
        timelineState: this.timelineSynchronizationRuntime?.getSharedState?.()?.adapters?.assessment || this.runtime.metadata?.assessmentAdapter?.timelineState || {}
      }
    };

    this.emitRuntimeGraphEvent('AssessmentPlanGenerated', {
      lessonId: output.lessonId,
      mode,
      questionCount: asArray(output.questionBank).length,
      masteryScore: output.masteryScore,
      completionScore: output.completionScore,
      learningConfidence: output.learningConfidence
    });

    asArray(output.questionBank).slice(0, this.options.maxQuestions).forEach((question) => {
      this.emitRuntimeGraphEvent('AssessmentQuestionReady', {
        questionId: question.id,
        type: question.type,
        difficultyLevel: question.difficultyLevel,
        mode: question.mode,
        objective: question.objective
      });
    });

    asArray(output.feedbackPlan.instantFeedback).forEach((item) => {
      this.emitRuntimeGraphEvent('AssessmentFeedbackReady', item);
    });

    this.emitRuntimeGraphEvent('AssessmentWeakAreaMapReady', {
      weakAreaCount: asArray(output.weakAreaMap).length,
      knowledgeGapCount: asArray(output.knowledgeGaps).length
    });

    this.persistSession();

    return {
      output,
      validation,
      diagnostics: {
        mode,
        difficultyPlan,
        questionTypeCount: questionTypes.length,
        unknownQuestionTypes: questionTypes.filter((entry) => !entry.known).map((entry) => entry.type),
        generatedAt: Date.now()
      }
    };
  }

  synchronize(reason = 'manual', input = {}) {
    const result = this.generate(input);
    this.emit('assessment-synchronized', {
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

    this.emitRuntimeGraphEvent('AssessmentTimelineMutation', {
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

    this.emitRuntimeGraphEvent('AssessmentInterrupted', {
      reason,
      resumeTimeMs: this.state.recovery.resumeTimeMs
    });

    this.persistSession();
    return true;
  }

  resumeFromCheckpoint(checkpointId = null) {
    const resolvedCheckpointId = safeString(checkpointId || this.state.recovery.checkpointId || '') || null;
    this.state.recovery.checkpointId = resolvedCheckpointId;
    this.state.recovery.interrupted = false;
    this.state.recovery.resumeCount += 1;
    this.state.status = 'Ready';

    if (resolvedCheckpointId && this.timelineSynchronizationRuntime?.resumeFromCheckpoint) {
      this.timelineSynchronizationRuntime.resumeFromCheckpoint(resolvedCheckpointId);
    }

    this.emitRuntimeGraphEvent('AssessmentResumed', {
      checkpointId: resolvedCheckpointId,
      resumeCount: this.state.recovery.resumeCount
    });

    return this.synchronize('resume-from-checkpoint', {
      progressState: {
        checkpointId: resolvedCheckpointId,
        interrupted: false,
        resumeTimeMs: this.state.recovery.resumeTimeMs
      }
    });
  }

  persistSession(adapter = this.persistenceAdapter) {
    if (!adapter) return false;

    const payload = JSON.stringify({
      schemaVersion: UNIVERSAL_ASSESSMENT_SCHEMA_VERSION,
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
    this.emit('assessment-persisted', {
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

    this.emitRuntimeGraphEvent('AssessmentRecovered', {
      persistenceKey: this.persistenceKey,
      interrupted: true
    });

    this.emit('assessment-recovered', {
      persistenceKey: this.persistenceKey
    });

    return true;
  }

  snapshot() {
    const state = deepClone(this.state);
    state.supportedQuestionTypes = [...SUPPORTED_QUESTION_TYPES];
    state.supportedAssessmentModes = [...SUPPORTED_ASSESSMENT_MODES];
    state.supportedDifficultyLevels = [...SUPPORTED_DIFFICULTY_LEVELS];
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

    this.emit('assessment-destroyed', {
      sceneId: this.runtime?.sceneId || null
    });
  }

  static supportedChannels() {
    return [
      'assessment-runtime-event',
      'assessment-synchronized',
      'assessment-persisted',
      'assessment-recovered',
      'assessment-destroyed'
    ];
  }
}

export function createUniversalQuizAdaptiveAssessmentEngine(runtime = {}, options = {}) {
  return new UniversalQuizAdaptiveAssessmentEngine(runtime, options);
}

export function runUniversalQuizAdaptiveAssessmentEngine(runtime = {}, input = {}, options = {}) {
  const engine = createUniversalQuizAdaptiveAssessmentEngine(runtime, options);
  return engine.generate(input);
}
