import {
  UNIVERSAL_AI_MENTOR_COACH_INTERVIEWER_SCHEMA_VERSION,
  SUPPORTED_BASE_MENTOR_TYPES,
  SUPPORTED_BASE_CAPABILITIES,
  DEFAULT_UNIVERSAL_AI_MENTOR_COACH_INTERVIEWER_CONFIG,
  isObject,
  asArray,
  safeString,
  toFiniteNumber,
  clamp,
  uniqueStrings,
  normalizeMentorType,
  normalizeCapability
} from './UniversalAIMentorCoachInterviewerEngineConfig.js';

const STORE_KEY = '__daksha_universal_ai_mentor_coach_interviewer_store__';

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
    schemaVersion: UNIVERSAL_AI_MENTOR_COACH_INTERVIEWER_SCHEMA_VERSION,
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
      recentEvents: [],
      sessionSummaries: []
    }
  };
}

function pushHistory(state = {}, entry = {}, maxHistory = 1400, bucket = 'recentEvents') {
  const history = isObject(state.history) ? state.history : { recentEvents: [], sessionSummaries: [] };
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
    knowledgeGraph: isObject(input.knowledgeGraph) ? input.knowledgeGraph : runtime?.metadata?.knowledgeMemoryAdapter?.output?.knowledgeGraph || {},
    learningAnalytics: isObject(input.learningAnalytics) ? input.learningAnalytics : runtime?.metadata?.learningAnalyticsAdapter || {},
    assessmentResults: isObject(input.assessmentResults) ? input.assessmentResults : runtime?.metadata?.assessmentAdapter || {},
    aiTeacherEvents: asArray(input.aiTeacherEvents).length ? asArray(input.aiTeacherEvents) : asArray(runtime?.metadata?.aiTeacherAdapter?.runtimeState?.history?.recentEvents),
    userProfile: isObject(input.userProfile) ? input.userProfile : runtime?.metadata?.userLearningProfile || runtime?.metadata?.learningProfile || {},
    personalization: isObject(input.personalization) ? input.personalization : runtime?.metadata?.personalizationAdaptiveAdapter || {},
    timelineEvents: asArray(input.timelineEvents).length ? asArray(input.timelineEvents) : asArray(runtime?.sceneEventRuntime?.events),
    sessionHistory: asArray(input.sessionHistory).length ? asArray(input.sessionHistory) : asArray(runtime?.metadata?.sessionHistory),
    learningIntent: isObject(input.learningIntent) ? input.learningIntent : runtime?.metadata?.intentProfile || runtime?.metadata?.learningIntent || {},
    pipeline: isObject(input.pipeline) ? input.pipeline : runtime?.metadata?.pipeline || runtime?.metadata?.sourceMeta || {},
    interactionEvents: asArray(input.interactionEvents).length ? asArray(input.interactionEvents) : asArray(runtime?.sceneEventRuntime?.events),
    mentorTypes: asArray(input.mentorTypes),
    capabilities: asArray(input.capabilities),
    preferredLanguage: safeString(input.preferredLanguage || ''),
    futureMentoringStyles: asArray(input.futureMentoringStyles)
  };
}

function resolveLanguages(source = {}, options = {}) {
  const language = safeString(
    source.preferredLanguage
    || source.userProfile?.preferredLanguage
    || source.userProfile?.language
    || source.lessonGraph?.language
    || source.learningIntent?.language
    || options.defaultLanguage
    || 'English'
  ) || 'English';

  const supportedLanguages = uniqueStrings([
    ...asArray(source.userProfile?.supportedLanguages),
    ...asArray(source.pipeline?.supportedLanguages),
    language
  ], 60);

  return { language, supportedLanguages };
}

function resolveMentorTypes(source = {}) {
  const requested = uniqueStrings([
    ...asArray(source.mentorTypes),
    ...asArray(source.learningIntent?.mentorTypes),
    ...SUPPORTED_BASE_MENTOR_TYPES
  ], 420);

  const normalized = requested.map((type) => normalizeMentorType(type));
  return {
    activeMentorTypes: uniqueStrings(normalized.map((item) => item.mentorType), 420),
    unknownFutureMentorTypes: uniqueStrings(normalized.filter((item) => !item.known).map((item) => item.mentorType), 260)
  };
}

function resolveCapabilities(source = {}) {
  const requested = uniqueStrings([
    ...asArray(source.capabilities),
    ...asArray(source.learningIntent?.capabilities),
    ...asArray(source.pipeline?.mentorCapabilities),
    ...SUPPORTED_BASE_CAPABILITIES
  ], 420);

  const normalized = requested.map((capability) => normalizeCapability(capability));
  return {
    enabledCapabilities: uniqueStrings(normalized.map((item) => item.capability), 420),
    unknownCapabilities: uniqueStrings(normalized.filter((item) => !item.known).map((item) => item.capability), 260)
  };
}

function computeSignals(source = {}) {
  const analyticsOutput = isObject(source.learningAnalytics?.output) ? source.learningAnalytics.output : source.learningAnalytics;
  const assessmentOutput = isObject(source.assessmentResults?.output) ? source.assessmentResults.output : source.assessmentResults;

  const confidence = clamp(assessmentOutput?.learningConfidence ?? analyticsOutput?.learningConfidence ?? 0.55, 0, 1);
  const mastery = clamp(assessmentOutput?.masteryScore ?? analyticsOutput?.masteryScore ?? 0.55, 0, 1);
  const mistakes = Math.max(0, toFiniteNumber(assessmentOutput?.mistakes ?? analyticsOutput?.mistakes ?? 0, 0));
  const learnerLevel = safeString(source.userProfile?.learningLevel || source.userProfile?.level || 'intermediate') || 'intermediate';
  const communicationAbility = clamp(toFiniteNumber(source.userProfile?.communicationAbility ?? source.userProfile?.communicationScore ?? confidence, confidence), 0, 1);
  const learningSpeed = clamp(toFiniteNumber(source.userProfile?.learningSpeed ?? source.personalization?.output?.adaptivePacing?.recommendedPace ?? 1, 1), 0.4, 2.5);
  const engagement = clamp(asArray(source.interactionEvents).length / Math.max(1, asArray(source.interactionEvents).length + mistakes + 3), 0, 1);

  const careerGoals = uniqueStrings([
    ...asArray(source.userProfile?.careerGoals),
    ...asArray(source.personalization?.output?.careerRecommendations).map((item) => item?.goal || item),
    ...asArray(source.learningIntent?.careerGoals)
  ], 80);

  return {
    learnerLevel,
    confidence,
    mastery,
    mistakes,
    communicationAbility,
    learningSpeed,
    engagement,
    careerGoals,
    futureLearnerAttributes: isObject(source.userProfile?.futureLearnerAttributes) ? source.userProfile.futureLearnerAttributes : {},
    adaptationMode: mistakes > 3 || confidence < 0.45 ? 'recovery-coaching' : mastery > 0.8 ? 'challenge-advancement' : 'balanced-mentoring'
  };
}

function buildMentorPlan(source = {}, signals = {}, language = 'English', max = 200) {
  const focusAreas = uniqueStrings([
    ...asArray(source.lessonGraph?.keyConcepts),
    ...asArray(source.curriculumGraph?.topics).map((topic) => topic?.title || topic),
    ...asArray(source.knowledgeGraph?.nodes).map((node) => node?.label || node?.id)
  ], max);

  return focusAreas.slice(0, max).map((focus, index) => ({
    id: `mentor-plan-${index + 1}`,
    focus,
    action: index % 4 === 0 ? 'mentor' : index % 4 === 1 ? 'guide' : index % 4 === 2 ? 'recommend' : 'encourage',
    objective: `Increase practical command of ${focus}.`,
    language,
    adaptationMode: signals.adaptationMode
  }));
}

function buildCoachingPlan(mentorPlan = [], signals = {}, max = 200) {
  return asArray(mentorPlan).slice(0, max).map((step, index) => ({
    id: `coaching-plan-${index + 1}`,
    mentorStepId: step.id,
    checkpoint: `Checkpoint ${index + 1}`,
    strategy: signals.mistakes > 2 ? 'error-focused-practice' : 'progressive-challenge',
    expectedOutcome: `Learner demonstrates improved confidence in ${step.focus}.`
  }));
}

function buildInterviewPlan(source = {}, signals = {}, language = 'English', max = 180) {
  const skills = uniqueStrings([
    ...asArray(source.curriculumGraph?.skillMap).map((skill) => skill?.skill || skill),
    ...asArray(source.lessonGraph?.keyConcepts),
    ...asArray(source.userProfile?.targetSkills)
  ], max);

  return skills.slice(0, max).map((skill, index) => ({
    id: `interview-plan-${index + 1}`,
    skill,
    questionType: index % 3 === 0 ? 'technical' : index % 3 === 1 ? 'behavioral' : 'case-study',
    difficulty: signals.mastery > 0.75 ? 'advanced' : signals.mastery > 0.45 ? 'intermediate' : 'foundational',
    question: `Explain and apply ${skill} in a realistic scenario.`,
    language
  }));
}

function buildGoalTracking(source = {}, mentorPlan = [], signals = {}, max = 200) {
  const goals = uniqueStrings([
    ...asArray(source.lessonGraph?.learningObjectives),
    ...signals.careerGoals,
    ...asArray(source.personalization?.output?.personalizedObjectives).map((item) => item?.objective || item)
  ], max);

  return goals.slice(0, max).map((goal, index) => ({
    id: `goal-${index + 1}`,
    goal,
    status: index < Math.round(goals.length * signals.mastery) ? 'in-progress' : 'planned',
    confidence: clamp(signals.confidence - ((index % 6) * 0.04), 0, 1)
  }));
}

function buildSkillGapAnalysis(interviewPlan = [], signals = {}, max = 220) {
  return asArray(interviewPlan).slice(0, max).map((item, index) => ({
    id: `skill-gap-${index + 1}`,
    skill: item.skill,
    currentLevel: signals.mastery > 0.75 ? 'strong' : signals.mastery > 0.45 ? 'developing' : 'foundational',
    targetLevel: item.difficulty,
    gapSeverity: signals.mistakes > 3 && index < 8 ? 'high' : index < 16 ? 'medium' : 'low'
  }));
}

function buildCompetencyMatrix(skillGap = [], max = 220) {
  return asArray(skillGap).slice(0, max).map((item, index) => ({
    id: `competency-${index + 1}`,
    competency: item.skill,
    baseline: item.currentLevel,
    target: item.targetLevel,
    status: item.gapSeverity === 'high' ? 'needs-attention' : item.gapSeverity === 'medium' ? 'improving' : 'stable'
  }));
}

function buildImprovementPlan(skillGap = [], mentorPlan = [], max = 240) {
  return asArray(skillGap).slice(0, max).map((gap, index) => ({
    id: `improvement-${index + 1}`,
    skill: gap.skill,
    action: gap.gapSeverity === 'high' ? 'intensive-practice' : gap.gapSeverity === 'medium' ? 'guided-practice' : 'maintenance',
    linkedMentorStepId: asArray(mentorPlan)[index % Math.max(1, asArray(mentorPlan).length)]?.id || null,
    timelineHint: index < 5 ? 'short-term' : index < 14 ? 'mid-term' : 'long-term'
  }));
}

function buildLearningRecommendations(mentorPlan = [], max = 200) {
  return asArray(mentorPlan).slice(0, max).map((step, index) => ({
    id: `learning-rec-${index + 1}`,
    recommendation: `Practice ${step.focus} with one explain, one implementation, and one reflection cycle.`,
    priority: index < 8 ? 'high' : index < 20 ? 'medium' : 'normal'
  }));
}

function buildRoadmaps(signals = {}, competencyMatrix = [], max = 180) {
  return asArray(competencyMatrix).slice(0, max).map((item, index) => ({
    id: `roadmap-${index + 1}`,
    competency: item.competency,
    projectRecommendation: `Build a scoped project that demonstrates ${item.competency}.`,
    careerRecommendation: signals.careerGoals[index % Math.max(1, signals.careerGoals.length)] || `Apply ${item.competency} in role-aligned scenarios.`,
    competencyRecommendation: `Advance from ${item.baseline} to ${item.target} through weekly practice checkpoints.`
  }));
}

function buildScores(signals = {}) {
  const careerReadinessScore = clamp((signals.mastery * 0.5) + (signals.communicationAbility * 0.3) + (signals.confidence * 0.2), 0, 1);
  const interviewReadinessScore = clamp((signals.mastery * 0.45) + (signals.confidence * 0.35) + ((1 - clamp(signals.mistakes / 10, 0, 1)) * 0.2), 0, 1);
  const confidenceScore = clamp(signals.confidence, 0, 1);
  return {
    careerReadinessScore,
    interviewReadinessScore,
    confidenceScore
  };
}

function buildFeedbackReport(signals = {}, skillGap = []) {
  return {
    summary: signals.adaptationMode,
    strengths: asArray(skillGap).filter((item) => item.gapSeverity === 'low').slice(0, 12).map((item) => item.skill),
    improvementAreas: asArray(skillGap).filter((item) => item.gapSeverity !== 'low').slice(0, 12).map((item) => item.skill),
    coachingTone: signals.confidence < 0.45 ? 'supportive' : signals.mastery > 0.8 ? 'challenging' : 'balanced'
  };
}

function buildSessionSummary(source = {}, signals = {}, mentorPlan = [], coachingPlan = []) {
  return {
    lessonId: safeString(source.lessonGraph?.lessonId || 'runtime-lesson') || 'runtime-lesson',
    adaptationMode: signals.adaptationMode,
    mentorActions: asArray(mentorPlan).length,
    coachingCheckpoints: asArray(coachingPlan).length,
    interactionEvents: asArray(source.interactionEvents).length,
    timelineEvents: asArray(source.timelineEvents).length
  };
}

function buildProgressForecast(signals = {}, goals = []) {
  return {
    projectedReadiness: clamp(signals.mastery + 0.1, 0, 1),
    riskLevel: signals.mistakes > 4 ? 'high' : signals.mistakes > 1 ? 'medium' : 'low',
    goalCoverageForecast: clamp(asArray(goals).length / Math.max(1, asArray(goals).length + signals.mistakes + 2), 0, 1)
  };
}

function buildMilestoneTracking(goals = [], max = 220) {
  return asArray(goals).slice(0, max).map((goal, index) => ({
    id: `milestone-${index + 1}`,
    goalId: goal.id,
    milestone: `Milestone ${index + 1}`,
    status: goal.status,
    confidence: goal.confidence
  }));
}

function buildEventList(prefix, eventType, source = [], max = 400) {
  return asArray(source).slice(0, max).map((item, index) => ({
    eventId: `${prefix}-${index + 1}`,
    eventType,
    sequence: index + 1,
    payload: item
  }));
}

function buildRuntimeGraphEvents(output = {}, maxEvents = 1600) {
  const events = [];
  function push(eventType, channel, payload) {
    if (events.length >= maxEvents) return;
    events.push({
      eventId: `runtime-graph-event-${events.length + 1}`,
      eventType,
      channel,
      timestampMs: Date.now(),
      payload
    });
  }

  push('mentor-plan', 'runtime-graph.mentor.plan', output.mentorPlan);
  push('coaching-plan', 'runtime-graph.mentor.coaching-plan', output.coachingPlan);
  push('interview-plan', 'runtime-graph.mentor.interview-plan', output.interviewPlan);
  push('goal-tracking', 'runtime-graph.mentor.goal-tracking', output.goalTracking);
  push('skill-gap-analysis', 'runtime-graph.mentor.skill-gap-analysis', output.skillGapAnalysis);
  push('competency-matrix', 'runtime-graph.mentor.competency-matrix', output.competencyMatrix);
  push('improvement-plan', 'runtime-graph.mentor.improvement-plan', output.improvementPlan);
  push('learning-recommendations', 'runtime-graph.mentor.learning-recommendations', output.learningRecommendations);
  push('feedback-report', 'runtime-graph.mentor.feedback-report', output.feedbackReport);
  push('session-summary', 'runtime-graph.mentor.session-summary', output.sessionSummary);
  push('progress-forecast', 'runtime-graph.mentor.progress-forecast', output.progressForecast);
  push('milestone-tracking', 'runtime-graph.mentor.milestone-tracking', output.milestoneTracking);
  push('coaching-events', 'runtime-graph.mentor.coaching-events', output.coachingEvents);
  push('mentor-events', 'runtime-graph.mentor.mentor-events', output.mentorEvents);
  push('interview-events', 'runtime-graph.mentor.interview-events', output.interviewEvents);

  return events;
}

function buildOutput(runtime = {}, input = {}, state = createDefaultState(), options = {}) {
  const source = resolveInput(runtime, input);
  const runtimeSummary = inferRuntimeGraphSummary(source.runtimeGraph);
  const language = resolveLanguages(source, options);
  const mentorTypes = resolveMentorTypes(source);
  const capabilities = resolveCapabilities(source);
  const signals = computeSignals(source);

  const mentorPlan = buildMentorPlan(source, signals, language.language, options.maxItems);
  const coachingPlan = buildCoachingPlan(mentorPlan, signals, options.maxItems);
  const interviewPlan = buildInterviewPlan(source, signals, language.language, options.maxItems);
  const goalTracking = buildGoalTracking(source, mentorPlan, signals, options.maxItems);
  const skillGapAnalysis = buildSkillGapAnalysis(interviewPlan, signals, options.maxItems);
  const competencyMatrix = buildCompetencyMatrix(skillGapAnalysis, options.maxItems);
  const improvementPlan = buildImprovementPlan(skillGapAnalysis, mentorPlan, options.maxItems);
  const learningRecommendations = buildLearningRecommendations(mentorPlan, options.maxItems);
  const roadmap = buildRoadmaps(signals, competencyMatrix, options.maxItems);
  const scores = buildScores(signals);
  const feedbackReport = buildFeedbackReport(signals, skillGapAnalysis);
  const sessionSummary = buildSessionSummary(source, signals, mentorPlan, coachingPlan);
  const progressForecast = buildProgressForecast(signals, goalTracking);
  const milestoneTracking = buildMilestoneTracking(goalTracking, options.maxItems);

  const coachingEvents = buildEventList('coaching-event', 'coaching-event', coachingPlan, options.maxEvents);
  const mentorEvents = buildEventList('mentor-event', 'mentor-event', mentorPlan, options.maxEvents);
  const interviewEvents = buildEventList('interview-event', 'interview-event', interviewPlan, options.maxEvents);

  const outputBase = {
    schemaVersion: UNIVERSAL_AI_MENTOR_COACH_INTERVIEWER_SCHEMA_VERSION,
    sessionId: safeString(source.lessonGraph?.lessonId || `mentor-session-${Date.now()}`) || `mentor-session-${Date.now()}`,
    lessonId: safeString(source.lessonGraph?.lessonId || 'runtime-lesson') || 'runtime-lesson',
    language: language.language,
    supportedLanguages: language.supportedLanguages,
    communicationContract: {
      mode: 'runtime-graph-events-only',
      namespace: 'runtime-graph.mentor'
    },
    mentorTypes,
    capabilities,
    mentorPlan,
    coachingPlan,
    interviewPlan,
    goalTracking,
    skillGapAnalysis,
    competencyMatrix,
    improvementPlan,
    learningRecommendations,
    careerReadinessScore: scores.careerReadinessScore,
    interviewReadinessScore: scores.interviewReadinessScore,
    confidenceScore: scores.confidenceScore,
    feedbackReport,
    sessionSummary,
    progressForecast,
    milestoneTracking,
    coachingEvents,
    mentorEvents,
    interviewEvents,
    adaptiveInterviewQuestions: asArray(interviewPlan).slice(0, options.maxItems),
    coachingCheckpoints: asArray(coachingPlan).slice(0, options.maxItems),
    mentorMilestones: asArray(milestoneTracking).slice(0, options.maxItems),
    personalizedFeedback: feedbackReport,
    improvementRoadmap: roadmap,
    competencyRecommendations: asArray(roadmap).map((item) => item.competencyRecommendation),
    projectRecommendations: asArray(roadmap).map((item) => item.projectRecommendation),
    careerRecommendations: asArray(roadmap).map((item) => item.careerRecommendation),
    futureMentoringStyles: uniqueStrings([
      ...asArray(source.futureMentoringStyles),
      ...asArray(source.pipeline?.futureMentoringStyles)
    ], 220),
    diagnostics: {
      generatedAt: Date.now(),
      runtimeGraphNodeCount: runtimeSummary.nodeCount,
      runtimeGraphRelationshipCount: runtimeSummary.relationshipCount,
      adaptationMode: signals.adaptationMode,
      unknownMentorTypeCount: asArray(mentorTypes.unknownFutureMentorTypes).length,
      unknownCapabilityCount: asArray(capabilities.unknownCapabilities).length
    },
    synchronization: {
      integration: {
        universalLearningPipeline: { status: 'integrated', hasPipeline: isObject(source.pipeline) },
        lessonGenerator: { status: 'integrated', hasLessonGraph: isObject(source.lessonGraph) },
        curriculumEngine: { status: 'integrated', hasCurriculumGraph: isObject(source.curriculumGraph) },
        aiTeacher: { status: 'integrated', eventCount: asArray(source.aiTeacherEvents).length },
        runtimeGraph: { status: 'integrated', nodeCount: runtimeSummary.nodeCount, relationshipCount: runtimeSummary.relationshipCount },
        timelineEngine: { status: 'integrated', eventCount: asArray(source.timelineEvents).length },
        knowledgeGraph: { status: 'integrated', nodeCount: asArray(source.knowledgeGraph?.nodes).length },
        assessmentEngine: { status: 'integrated', hasAssessment: Boolean(source.assessmentResults?.output || source.assessmentResults?.questionBank) },
        learningAnalytics: { status: 'integrated', hasAnalytics: Boolean(source.learningAnalytics?.output || source.learningAnalytics?.masteryScore) },
        personalizationEngine: { status: 'integrated', hasPersonalization: Boolean(source.personalization?.output || source.personalization?.runtimeState) },
        interactionEngine: { status: 'integrated', eventCount: asArray(source.interactionEvents).length }
      },
      versionCompatibility: {
        schemaVersion: UNIVERSAL_AI_MENTOR_COACH_INTERVIEWER_SCHEMA_VERSION,
        backwardCompatible: true,
        forwardCompatible: true
      }
    },
    sessionRecoveryMetadata: {
      interrupted: state.recovery?.interrupted === true,
      checkpointId: safeString(state.recovery?.checkpointId || '') || null,
      resumeCount: Math.max(0, toFiniteNumber(state.recovery?.resumeCount, 0)),
      resumeTimeMs: Math.max(0, toFiniteNumber(state.recovery?.resumeTimeMs, 0)),
      contextRestoration: {
        enabled: true,
        historyRestored: true,
        progressPersistence: true
      }
    }
  };

  return {
    ...outputBase,
    runtimeGraphEvents: buildRuntimeGraphEvents(outputBase, options.maxEvents)
  };
}

export function validateUniversalAIMentorCoachInterviewerOutput(output = {}) {
  const source = isObject(output) ? output : {};
  const errors = [];
  const warnings = [];

  if (!safeString(source.sessionId)) errors.push('Missing sessionId.');
  if (!safeString(source.lessonId)) errors.push('Missing lessonId.');
  if (!isObject(source.communicationContract) || safeString(source.communicationContract.mode) !== 'runtime-graph-events-only') {
    errors.push('communicationContract.mode must be runtime-graph-events-only.');
  }

  [
    'mentorTypes',
    'capabilities',
    'feedbackReport',
    'sessionSummary',
    'progressForecast',
    'sessionRecoveryMetadata',
    'diagnostics',
    'synchronization'
  ].forEach((field) => {
    if (!isObject(source[field])) {
      errors.push(`${field} must be an object.`);
    }
  });

  [
    'mentorPlan',
    'coachingPlan',
    'interviewPlan',
    'goalTracking',
    'skillGapAnalysis',
    'competencyMatrix',
    'improvementPlan',
    'learningRecommendations',
    'milestoneTracking',
    'coachingEvents',
    'mentorEvents',
    'interviewEvents',
    'runtimeGraphEvents'
  ].forEach((field) => {
    if (!Array.isArray(source[field])) {
      errors.push(`${field} must be an array.`);
    }
  });

  const eventTypes = new Set(asArray(source.runtimeGraphEvents).map((event) => safeString(event?.eventType)));
  [
    'mentor-plan',
    'coaching-plan',
    'interview-plan',
    'goal-tracking',
    'skill-gap-analysis',
    'competency-matrix',
    'improvement-plan',
    'learning-recommendations',
    'feedback-report',
    'session-summary',
    'progress-forecast',
    'milestone-tracking',
    'coaching-events',
    'mentor-events',
    'interview-events'
  ].forEach((type) => {
    if (!eventTypes.has(type)) {
      errors.push(`Missing runtime graph event ${type}.`);
    }
  });

  const serialized = JSON.stringify(source);
  if (/speech|video|webrtc|renderer|three\.|webgl|ui-template/i.test(serialized)) {
    errors.push('Forbidden rendering/streaming/synthesis payload detected.');
  }

  if (asArray(source?.mentorTypes?.unknownFutureMentorTypes).length > 0) {
    warnings.push('Unknown future mentor/coaching/interviewer types are preserved automatically.');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    status: errors.length === 0 ? (warnings.length ? 'warning' : 'valid') : 'invalid'
  };
}

export function serializeUniversalAIMentorCoachInterviewerOutput(output = {}) {
  return JSON.stringify({
    schemaVersion: UNIVERSAL_AI_MENTOR_COACH_INTERVIEWER_SCHEMA_VERSION,
    serializedAt: Date.now(),
    output
  });
}

export function migrateUniversalAIMentorCoachInterviewerOutput(input = {}) {
  const source = isObject(input) ? input : {};

  if (safeString(source.schemaVersion) === UNIVERSAL_AI_MENTOR_COACH_INTERVIEWER_SCHEMA_VERSION && Array.isArray(source.runtimeGraphEvents)) {
    return source;
  }

  const lessonId = safeString(source.lessonId || source.id || 'legacy-lesson') || 'legacy-lesson';
  const migrated = buildOutput({}, {
    lessonGraph: {
      lessonId,
      title: safeString(source.title || 'Recovered Mentor Session') || 'Recovered Mentor Session',
      language: safeString(source.language || 'English') || 'English',
      keyConcepts: asArray(source.topics)
    },
    mentorTypes: asArray(source.mentorTypes),
    capabilities: asArray(source.capabilities)
  }, createDefaultState(), DEFAULT_UNIVERSAL_AI_MENTOR_COACH_INTERVIEWER_CONFIG);

  return {
    ...migrated,
    diagnostics: {
      ...migrated.diagnostics,
      migratedFromSchema: safeString(source.schemaVersion || 'legacy') || 'legacy'
    }
  };
}

export function deserializeUniversalAIMentorCoachInterviewerOutput(payload = '') {
  const parsed = parsePayload(payload);
  if (!parsed) {
    const fallback = migrateUniversalAIMentorCoachInterviewerOutput({
      lessonId: 'recovered-lesson',
      title: 'Recovered Mentor Session'
    });

    return {
      output: fallback,
      validation: {
        valid: false,
        status: 'fallback',
        errors: ['Failed to parse mentor coach interviewer payload.'],
        warnings: []
      }
    };
  }

  const output = migrateUniversalAIMentorCoachInterviewerOutput(parsed.output || parsed);
  return {
    output,
    validation: validateUniversalAIMentorCoachInterviewerOutput(output)
  };
}

export class UniversalAIMentorCoachInterviewerEngine {
  constructor(runtime = {}, options = {}) {
    this.runtime = runtime;
    this.options = {
      ...DEFAULT_UNIVERSAL_AI_MENTOR_COACH_INTERVIEWER_CONFIG,
      ...(isObject(options) ? options : {})
    };

    this.persistenceAdapter = this.options.persistenceAdapter || createDefaultPersistenceAdapter();
    this.persistenceKey = safeString(this.options.persistenceKey || DEFAULT_UNIVERSAL_AI_MENTOR_COACH_INTERVIEWER_CONFIG.persistenceKey)
      || DEFAULT_UNIVERSAL_AI_MENTOR_COACH_INTERVIEWER_CONFIG.persistenceKey;

    this.state = createDefaultState();
    this.recoverSession();
  }

  generate(input = {}) {
    const startedAt = Date.now();
    const output = buildOutput(this.runtime, input, this.state, this.options);
    const validation = validateUniversalAIMentorCoachInterviewerOutput(output);

    this.state.output = output;
    this.state.status = validation.valid ? 'Ready' : 'Warning';
    this.state.diagnostics.runs += 1;
    this.state.diagnostics.latestDurationMs = Math.max(0, Date.now() - startedAt);
    this.state.diagnostics.warnings = [...this.state.diagnostics.warnings, ...validation.warnings].slice(-this.options.maxHistory);

    pushHistory(this.state, {
      type: 'mentor-session-generated',
      sessionId: output.sessionId,
      at: Date.now(),
      valid: validation.valid
    }, this.options.maxHistory, 'recentEvents');

    pushHistory(this.state, {
      sessionId: output.sessionId,
      summary: output.sessionSummary,
      score: output.interviewReadinessScore,
      at: Date.now()
    }, this.options.maxHistory, 'sessionSummaries');

    this.runtime.metadata = {
      ...(this.runtime.metadata || {}),
      mentorCoachInterviewerAdapter: {
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
        adaptationMode: output?.diagnostics?.adaptationMode || 'balanced-mentoring'
      }
    };
  }

  synchronize(reason = 'manual', input = {}) {
    const result = this.generate(input);

    pushHistory(this.state, {
      type: 'mentor-session-synchronized',
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
      type: 'mentor-session-interrupted',
      reason: safeString(reason) || 'interrupted',
      at: Date.now()
    }, this.options.maxHistory, 'recentEvents');

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
    }, this.options.maxHistory, 'recentEvents');

    return this.synchronize(`mutation:${safeType}`, {
      interactionEvents: asArray(this.runtime?.sceneEventRuntime?.events)
    });
  }

  persistSession(adapter = this.persistenceAdapter) {
    if (!adapter) return false;

    const payload = JSON.stringify({
      schemaVersion: UNIVERSAL_AI_MENTOR_COACH_INTERVIEWER_SCHEMA_VERSION,
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
        sessionSummaries: asArray(source?.history?.sessionSummaries).slice(-this.options.maxHistory)
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
      'mentor-session-generated',
      'mentor-session-synchronized',
      'mentor-session-persisted',
      'mentor-session-recovered',
      'mentor-session-destroyed'
    ];
  }
}

export function createUniversalAIMentorCoachInterviewerEngine(runtime = {}, options = {}) {
  return new UniversalAIMentorCoachInterviewerEngine(runtime, options);
}

export function runUniversalAIMentorCoachInterviewerEngine(input = {}, options = {}) {
  const runtime = isObject(options.runtime) ? options.runtime : {};
  const normalizedOptions = {
    ...options
  };
  delete normalizedOptions.runtime;

  const engine = createUniversalAIMentorCoachInterviewerEngine(runtime, normalizedOptions);
  return engine.generate(input);
}
