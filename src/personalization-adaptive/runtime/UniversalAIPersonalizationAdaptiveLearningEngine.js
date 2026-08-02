import {
  UNIVERSAL_AI_PERSONALIZATION_SCHEMA_VERSION,
  DEFAULT_UNIVERSAL_AI_PERSONALIZATION_CONFIG,
  isObject,
  asArray,
  safeString,
  toFiniteNumber,
  clamp,
  uniqueStrings,
  normalizePersonalizationLevel
} from './UniversalAIPersonalizationAdaptiveLearningEngineConfig.js';

const STORE_KEY = '__daksha_universal_ai_personalization_store__';

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
    schemaVersion: UNIVERSAL_AI_PERSONALIZATION_SCHEMA_VERSION,
    status: 'Ready',
    output: null,
    diagnostics: {
      runs: 0,
      recoveries: 0,
      persistedSessions: 0,
      warnings: [],
      latestDurationMs: 0
    },
    sync: {
      offlineQueue: [],
      deviceSnapshots: {},
      lastSyncedAt: 0,
      lastDeviceId: null
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

function pushHistory(state = {}, entry = {}, maxHistory = 800) {
  const events = asArray(state?.history?.recentEvents);
  events.push(entry);
  while (events.length > maxHistory) {
    events.shift();
  }
  state.history.recentEvents = events;
}

function resolveRuntimeInput(runtime = {}, input = {}) {
  return {
    lessonGraph: isObject(input.lessonGraph) ? input.lessonGraph : runtime?.metadata?.lessonGraph || {},
    curriculumGraph: isObject(input.curriculumGraph) ? input.curriculumGraph : runtime?.metadata?.curriculumAuthoringAdapter?.output || {},
    runtimeGraph: isObject(input.runtimeGraph) ? input.runtimeGraph : runtime?.graph || {},
    learningAnalytics: isObject(input.learningAnalytics) ? input.learningAnalytics : runtime?.metadata?.learningAnalyticsAdapter || {},
    assessmentResults: isObject(input.assessmentResults) ? input.assessmentResults : runtime?.metadata?.assessmentAdapter || {},
    aiTeacherEvents: asArray(input.aiTeacherEvents).length ? asArray(input.aiTeacherEvents) : asArray(runtime?.metadata?.aiTeacherAdapter?.runtimeState?.history?.recentEvents),
    timelineEvents: asArray(input.timelineEvents).length ? asArray(input.timelineEvents) : asArray(runtime?.sceneEventRuntime?.events),
    userLearningProfile: isObject(input.userLearningProfile) ? input.userLearningProfile : runtime?.metadata?.userLearningProfile || runtime?.metadata?.learningProfile || {},
    sessionHistory: asArray(input.sessionHistory).length ? asArray(input.sessionHistory) : asArray(runtime?.metadata?.sessionHistory),
    userPreferences: isObject(input.userPreferences) ? input.userPreferences : runtime?.metadata?.userPreferences || {},
    learningIntent: isObject(input.learningIntent) ? input.learningIntent : runtime?.metadata?.intentProfile || runtime?.metadata?.learningIntent || {},
    pipeline: isObject(input.pipeline) ? input.pipeline : runtime?.metadata?.pipeline || runtime?.metadata?.sourceMeta || {},
    offlineEvents: asArray(input.offlineEvents),
    deviceSync: isObject(input.deviceSync) ? input.deviceSync : {}
  };
}

function computeProgressSignals(assessment = {}, analytics = {}, sessionHistory = [], timelineEvents = []) {
  const output = isObject(assessment?.output) ? assessment.output : assessment;
  const analyticsOutput = isObject(analytics?.output) ? analytics.output : analytics;

  const masteryScore = clamp(output?.masteryScore ?? analyticsOutput?.masteryScore ?? 0.55, 0, 1);
  const completion = clamp(output?.completionScore ?? analyticsOutput?.learningProgress?.lessonCompletion ?? 0.5, 0, 1);
  const confidence = clamp(output?.learningConfidence ?? analyticsOutput?.learningConfidence ?? 0.55, 0, 1);
  const mistakes = Math.max(0, toFiniteNumber(output?.mistakes ?? 0, 0));
  const revisionCount = Math.max(0, toFiniteNumber(analyticsOutput?.learningProgress?.revisionHistory?.totalRevisions ?? 0, 0));
  const attentionPatternScore = clamp(1 - (asArray(timelineEvents).filter((event) => safeString(event?.type).toLowerCase().includes('pause')).length / Math.max(1, asArray(timelineEvents).length)), 0, 1);
  const interactionDensity = clamp(asArray(timelineEvents).length / Math.max(10, asArray(sessionHistory).length * 8), 0, 1);

  return {
    masteryScore,
    completion,
    confidence,
    mistakes,
    revisionCount,
    attentionPatternScore,
    interactionDensity
  };
}

function buildPersonalizedObjectives(lessonGraph = {}, level = 'intermediate') {
  const objectives = uniqueStrings([
    ...asArray(lessonGraph.learningObjectives),
    ...asArray(lessonGraph.keyConcepts).map((concept) => `Master ${concept}`)
  ], 200);

  return objectives.map((objective, index) => ({
    id: `personalized-objective-${index + 1}`,
    objective,
    level,
    priority: index < 4 ? 'high' : index < 10 ? 'medium' : 'normal'
  }));
}

function buildPersonalizedLearningPath(objectives = [], topics = []) {
  const topicLookup = asArray(topics);
  return objectives.slice(0, 180).map((objective, index) => ({
    id: `path-step-${index + 1}`,
    objectiveId: objective.id,
    topic: topicLookup[index % Math.max(1, topicLookup.length)]?.title || safeString(objective.objective),
    action: index % 3 === 0 ? 'learn' : index % 3 === 1 ? 'practice' : 'assess',
    order: index + 1
  }));
}

function buildAdaptiveRoadmap(path = [], level = 'intermediate') {
  const chunkSize = Math.max(1, Math.ceil(path.length / 5));
  const stages = [];
  for (let index = 0; index < path.length; index += chunkSize) {
    const chunk = path.slice(index, index + chunkSize);
    const order = stages.length + 1;
    stages.push({
      id: `adaptive-stage-${order}`,
      stage: `Stage ${order}`,
      level,
      stepIds: chunk.map((item) => item.id)
    });
  }

  return {
    stages,
    sequence: stages.map((stage) => stage.id)
  };
}

function buildDailyStudyPlan(path = [], preferences = {}) {
  const preferredHours = Math.max(1, toFiniteNumber(preferences?.dailyHours, 1));
  return path.slice(0, 30).map((step, index) => ({
    id: `daily-plan-${index + 1}`,
    day: index + 1,
    stepId: step.id,
    focus: step.topic,
    estimatedHours: clamp(preferredHours, 0.5, 6)
  }));
}

function buildWeeklyPlan(path = []) {
  const output = [];
  const chunk = Math.max(1, Math.ceil(path.length / 8));
  for (let index = 0; index < path.length; index += chunk) {
    const week = output.length + 1;
    output.push({
      id: `weekly-plan-${week}`,
      week,
      stepIds: path.slice(index, index + chunk).map((item) => item.id)
    });
  }
  return output;
}

function buildMonthlyPlan(path = []) {
  const output = [];
  const chunk = Math.max(1, Math.ceil(path.length / 4));
  for (let index = 0; index < path.length; index += chunk) {
    const month = output.length + 1;
    output.push({
      id: `monthly-plan-${month}`,
      month,
      stepIds: path.slice(index, index + chunk).map((item) => item.id)
    });
  }
  return output;
}

function buildRecommendedPractice(path = [], signals = {}) {
  return path.slice(0, 120).map((step, index) => ({
    id: `practice-${index + 1}`,
    stepId: step.id,
    intensity: signals.mistakes > 3 ? 'high' : index % 3 === 0 ? 'medium' : 'normal',
    recommendation: `Practice ${step.topic} with targeted exercises and feedback loops.`
  }));
}

function buildRevisionSchedule(path = [], signals = {}) {
  return path.slice(0, 120).map((step, index) => ({
    id: `revision-${index + 1}`,
    stepId: step.id,
    intervalDays: signals.revisionCount > 10 ? 1 : index < 4 ? 1 : index < 12 ? 3 : 7,
    reason: `Retain and reinforce ${step.topic}`
  }));
}

function buildWeakConceptRecoveryPlan(lessonGraph = {}, signals = {}) {
  const concepts = uniqueStrings(asArray(lessonGraph.keyConcepts), 120);
  return concepts.map((concept, index) => ({
    id: `weak-recovery-${index + 1}`,
    concept,
    severity: signals.mistakes > 4 ? 'high' : index < 3 ? 'medium' : 'normal',
    plan: `Recover ${concept} through recap, worked examples, and reassessment.`
  }));
}

function buildSkillImprovementPlan(curriculumGraph = {}, level = 'intermediate') {
  const skills = uniqueStrings(asArray(curriculumGraph?.skillMap).map((entry) => entry?.skill), 160);
  return skills.map((skill, index) => ({
    id: `skill-improvement-${index + 1}`,
    skill,
    targetLevel: level,
    action: `Improve ${skill} through iterative practice and project application.`
  }));
}

function buildProjectRecommendations(curriculumGraph = {}, lessonGraph = {}) {
  const curriculumProjects = asArray(curriculumGraph.projects);
  if (curriculumProjects.length > 0) {
    return curriculumProjects.slice(0, 40).map((project, index) => ({
      id: `project-rec-${index + 1}`,
      projectId: safeString(project.id || `project-${index + 1}`),
      title: safeString(project.title || `Project ${index + 1}`),
      rationale: 'Recommended to consolidate applied mastery.'
    }));
  }

  return uniqueStrings(asArray(lessonGraph.keyConcepts), 40).map((concept, index) => ({
    id: `project-rec-${index + 1}`,
    projectId: `project-${index + 1}`,
    title: `Project: ${concept}`,
    rationale: `Demonstrate practical application of ${concept}.`
  }));
}

function buildCareerRecommendations(curriculumGraph = {}, preferences = {}) {
  const roles = asArray(curriculumGraph?.careerPath?.roles);
  const goals = uniqueStrings(asArray(preferences.careerGoals), 24);

  if (roles.length > 0) {
    return roles.slice(0, 24).map((role, index) => ({
      id: `career-rec-${index + 1}`,
      role: safeString(role.role || `Role ${index + 1}`),
      reason: goals[0] ? `Aligned with career goal: ${goals[0]}` : 'Aligned with demonstrated skill trajectory.'
    }));
  }

  return goals.map((goal, index) => ({
    id: `career-rec-${index + 1}`,
    role: goal,
    reason: 'User-specified career goal.'
  }));
}

function buildDifficultyRecommendation(level = 'intermediate', signals = {}) {
  const confidenceAdjusted = (signals.confidence * 0.4) + (signals.masteryScore * 0.4) + ((1 - clamp(signals.mistakes / 10, 0, 1)) * 0.2);
  const adjustedLevel = confidenceAdjusted >= 0.82 ? 'expert' : confidenceAdjusted >= 0.68 ? 'advanced' : confidenceAdjusted >= 0.5 ? 'intermediate' : 'beginner';

  return {
    currentLevel: level,
    recommendedLevel: adjustedLevel,
    score: confidenceAdjusted
  };
}

function buildPaceRecommendation(signals = {}, preferences = {}) {
  const preferredPace = clamp(preferences?.learningPace ?? 1, 0.4, 2.2);
  const attentionFactor = clamp(signals.attentionPatternScore ?? 0.6, 0, 1);
  const confidenceFactor = clamp(signals.confidence ?? 0.6, 0, 1);
  const paceScore = clamp((preferredPace / 2.2) * 0.4 + attentionFactor * 0.3 + confidenceFactor * 0.3, 0, 1);

  return {
    paceScore,
    recommendation: paceScore >= 0.72 ? 'accelerate' : paceScore <= 0.42 ? 'stabilize' : 'balanced',
    sessionsPerWeek: paceScore >= 0.72 ? 6 : paceScore <= 0.42 ? 3 : 5
  };
}

function buildMotivationStrategy(profile = {}, signals = {}) {
  const goals = uniqueStrings(asArray(profile.learningGoals), 12);
  return {
    primaryGoal: goals[0] || 'steady-progress',
    strategy: signals.confidence < 0.5 ? 'short-win-cycles' : 'milestone-driven-progress',
    reinforcement: signals.attentionPatternScore < 0.45 ? 'micro-sessions-with-breaks' : 'deep-focus-blocks'
  };
}

function buildMasteryForecast(path = [], signals = {}) {
  const projectedMastery = clamp(signals.masteryScore + (path.length > 20 ? 0.12 : 0.07), 0, 1);
  return {
    projectedMastery,
    projectedWeeks: Math.max(2, Math.ceil(path.length / 12))
  };
}

function buildSuccessProbability(signals = {}, pace = {}) {
  return clamp(
    (signals.masteryScore * 0.35) +
    (signals.confidence * 0.25) +
    ((1 - clamp(signals.mistakes / 10, 0, 1)) * 0.2) +
    (clamp(pace.paceScore, 0, 1) * 0.2),
    0,
    1
  );
}

function buildMilestones(path = [], weeklyPlan = []) {
  return weeklyPlan.slice(0, 40).map((week, index) => ({
    id: `milestone-${index + 1}`,
    week: week.week,
    stepCount: asArray(week.stepIds).length,
    checkpoint: path[asArray(week.stepIds).length - 1]?.topic || `Milestone ${index + 1}`
  }));
}

function buildAdaptiveNotificationsMetadata(path = [], signals = {}, preferences = {}) {
  const studyWindow = safeString(preferences.studyWindow || 'evening') || 'evening';
  return {
    cadence: signals.attentionPatternScore < 0.45 ? 'high-reminder' : 'balanced-reminder',
    channels: uniqueStrings(asArray(preferences.notificationChannels), 8),
    studyWindow,
    triggerCount: Math.min(120, path.length)
  };
}

function buildAdaptiveOutput(runtime = {}, input = {}, options = {}) {
  const source = resolveRuntimeInput(runtime, input);

  if (asArray(source.offlineEvents).length > 0) {
    source.sessionHistory = [...asArray(source.sessionHistory), ...source.offlineEvents];
  }

  const normalizedLevel = normalizePersonalizationLevel(
    source.userLearningProfile.learningLevel ||
    source.userLearningProfile.level ||
    options.defaultLevel
  );

  const runtimeGraphSummary = inferRuntimeGraphSummary(source.runtimeGraph);
  const signals = computeProgressSignals(source.assessmentResults, source.learningAnalytics, source.sessionHistory, source.timelineEvents);
  const topics = asArray(source.curriculumGraph?.topics).length > 0
    ? asArray(source.curriculumGraph.topics)
    : uniqueStrings([
      ...asArray(source.lessonGraph.topics),
      ...asArray(source.lessonGraph.keyConcepts)
    ], 200).map((topic, index) => ({ id: `topic-${index + 1}`, title: topic }));

  const personalizedObjectives = buildPersonalizedObjectives(source.lessonGraph, normalizedLevel.level);
  const personalizedLearningPath = buildPersonalizedLearningPath(personalizedObjectives, topics).slice(0, options.maxPathSteps);
  const adaptiveRoadmap = buildAdaptiveRoadmap(personalizedLearningPath, normalizedLevel.level);
  const dailyStudyPlan = buildDailyStudyPlan(personalizedLearningPath, source.userPreferences);
  const weeklyStudyPlan = buildWeeklyPlan(personalizedLearningPath);
  const monthlyLearningPlan = buildMonthlyPlan(personalizedLearningPath);
  const recommendedPractice = buildRecommendedPractice(personalizedLearningPath, signals);
  const revisionSchedule = buildRevisionSchedule(personalizedLearningPath, signals);
  const weakConceptRecoveryPlan = buildWeakConceptRecoveryPlan(source.lessonGraph, signals);
  const skillImprovementPlan = buildSkillImprovementPlan(source.curriculumGraph, normalizedLevel.level);
  const projectRecommendations = buildProjectRecommendations(source.curriculumGraph, source.lessonGraph);
  const careerRecommendations = buildCareerRecommendations(source.curriculumGraph, source.userPreferences);
  const difficultyRecommendation = buildDifficultyRecommendation(normalizedLevel.level, signals);
  const paceRecommendation = buildPaceRecommendation(signals, source.userPreferences);
  const motivationStrategy = buildMotivationStrategy(source.userLearningProfile, signals);
  const learningConfidence = clamp(signals.confidence, 0, 1);
  const masteryForecast = buildMasteryForecast(personalizedLearningPath, signals);
  const successProbability = buildSuccessProbability(signals, paceRecommendation);
  const personalizedMilestones = buildMilestones(personalizedLearningPath, weeklyStudyPlan);
  const adaptiveNotificationsMetadata = buildAdaptiveNotificationsMetadata(personalizedLearningPath, signals, source.userPreferences);

  return {
    schemaVersion: UNIVERSAL_AI_PERSONALIZATION_SCHEMA_VERSION,
    personalizationId: safeString(source.lessonGraph.lessonId || source.curriculumGraph.curriculumId || `personalization-${Date.now()}`) || `personalization-${Date.now()}`,
    lessonId: safeString(source.lessonGraph.lessonId || 'runtime-lesson') || 'runtime-lesson',
    curriculumId: safeString(source.curriculumGraph.curriculumId || source.curriculumGraph.course?.courseId || 'runtime-curriculum') || 'runtime-curriculum',
    language: safeString(source.userLearningProfile.language || source.learningIntent.language || source.lessonGraph.language || options.defaultLanguage) || options.defaultLanguage,
    personalizationLevel: normalizedLevel.level,
    personalizedLearningPath,
    adaptiveRoadmap,
    dailyStudyPlan,
    weeklyStudyPlan,
    monthlyLearningPlan,
    personalizedObjectives,
    recommendedPractice,
    revisionSchedule,
    weakConceptRecoveryPlan,
    skillImprovementPlan,
    projectRecommendations,
    careerRecommendations,
    difficultyRecommendation,
    paceRecommendation,
    motivationStrategy,
    learningConfidence,
    masteryForecast,
    successProbability,
    personalizedMilestones,
    adaptiveNotificationsMetadata,
    diagnostics: {
      unknownLevel: normalizedLevel.known === false,
      runtimeGraphNodeCount: runtimeGraphSummary.nodeCount,
      runtimeGraphRelationshipCount: runtimeGraphSummary.relationshipCount,
      sessionEventCount: asArray(source.sessionHistory).length,
      timelineEventCount: asArray(source.timelineEvents).length,
      aiTeacherEventCount: asArray(source.aiTeacherEvents).length,
      futureLearnerAttributes: Object.keys(source.userLearningProfile || {}).filter((key) => ![
        'learningLevel', 'level', 'language', 'learningGoals', 'weakConcepts', 'strongConcepts', 'learnerModes'
      ].includes(key))
    },
    synchronization: {
      integration: {
        universalLearningPipeline: {
          status: 'integrated',
          hasMetadata: isObject(source.pipeline)
        },
        lessonGenerator: {
          status: 'integrated',
          lessonId: safeString(source.lessonGraph.lessonId || '') || null
        },
        curriculumEngine: {
          status: 'integrated',
          curriculumId: safeString(source.curriculumGraph.curriculumId || source.curriculumGraph.course?.courseId || '') || null
        },
        aiTeacher: {
          status: 'integrated',
          eventCount: asArray(source.aiTeacherEvents).length
        },
        assessmentEngine: {
          status: 'integrated',
          hasAssessment: Boolean(source.assessmentResults?.output || source.assessmentResults?.questionBank)
        },
        learningAnalytics: {
          status: 'integrated',
          hasAnalytics: Boolean(source.learningAnalytics?.output || source.learningAnalytics?.masteryScore)
        },
        runtimeGraph: {
          status: 'integrated',
          nodeCount: runtimeGraphSummary.nodeCount,
          relationshipCount: runtimeGraphSummary.relationshipCount
        },
        timelineEngine: {
          status: 'integrated',
          eventCount: asArray(source.timelineEvents).length
        }
      },
      continuousPersonalization: true,
      realtimeAdaptation: true,
      interruptedRecovery: true,
      offlineLearningEnabled: true,
      multiDeviceLearningEnabled: true,
      futureModelCompatible: true,
      versionCompatibility: {
        schemaVersion: UNIVERSAL_AI_PERSONALIZATION_SCHEMA_VERSION,
        backwardCompatible: true,
        forwardCompatible: true
      }
    }
  };
}

export function validateUniversalAIPersonalizationOutput(output = {}) {
  const source = isObject(output) ? output : {};
  const errors = [];
  const warnings = [];

  if (!safeString(source.personalizationId)) errors.push('Missing personalizationId.');
  if (!safeString(source.lessonId)) errors.push('Missing lessonId.');
  if (!safeString(source.curriculumId)) errors.push('Missing curriculumId.');

  [
    'personalizedLearningPath',
    'dailyStudyPlan',
    'weeklyStudyPlan',
    'monthlyLearningPlan',
    'personalizedObjectives',
    'recommendedPractice',
    'revisionSchedule',
    'weakConceptRecoveryPlan',
    'skillImprovementPlan',
    'projectRecommendations',
    'careerRecommendations',
    'personalizedMilestones'
  ].forEach((field) => {
    if (!Array.isArray(source[field])) {
      errors.push(`${field} must be an array.`);
    }
  });

  if (!isObject(source.adaptiveRoadmap)) errors.push('adaptiveRoadmap must be an object.');
  if (!isObject(source.difficultyRecommendation)) errors.push('difficultyRecommendation must be an object.');
  if (!isObject(source.paceRecommendation)) errors.push('paceRecommendation must be an object.');
  if (!isObject(source.motivationStrategy)) errors.push('motivationStrategy must be an object.');
  if (!isObject(source.masteryForecast)) errors.push('masteryForecast must be an object.');
  if (!isObject(source.adaptiveNotificationsMetadata)) errors.push('adaptiveNotificationsMetadata must be an object.');
  if (!isObject(source.synchronization)) errors.push('synchronization must be an object.');

  const serialized = JSON.stringify(source);
  if (/renderer|three\.|webgl|speechsynthesis|texttospeech|tts|shader|fragment|vertex|canvas|notification-payload/i.test(serialized)) {
    errors.push('Forbidden renderer/speech/notification payload detected in personalization output.');
  }

  if (toFiniteNumber(source.learningConfidence, -1) < 0 || toFiniteNumber(source.learningConfidence, 2) > 1) {
    errors.push('learningConfidence must be in [0,1].');
  }

  if (toFiniteNumber(source.successProbability, -1) < 0 || toFiniteNumber(source.successProbability, 2) > 1) {
    errors.push('successProbability must be in [0,1].');
  }

  if (safeString(source.personalizationLevel) && normalizePersonalizationLevel(source.personalizationLevel).known === false) {
    warnings.push(`Unknown personalization level preserved: ${source.personalizationLevel}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    status: errors.length === 0 ? (warnings.length ? 'warning' : 'valid') : 'invalid'
  };
}

export function serializeUniversalAIPersonalizationOutput(output = {}) {
  return JSON.stringify({
    schemaVersion: UNIVERSAL_AI_PERSONALIZATION_SCHEMA_VERSION,
    serializedAt: Date.now(),
    output
  });
}

export function migrateUniversalAIPersonalizationOutput(input = {}) {
  const source = isObject(input) ? input : {};

  if (safeString(source.schemaVersion) === UNIVERSAL_AI_PERSONALIZATION_SCHEMA_VERSION && Array.isArray(source.personalizedLearningPath)) {
    return source;
  }

  const lessonId = safeString(source.lessonId || source.id || 'legacy-lesson') || 'legacy-lesson';
  const curriculumId = safeString(source.curriculumId || 'legacy-curriculum') || 'legacy-curriculum';
  const language = safeString(source.language || 'English') || 'English';

  return {
    schemaVersion: UNIVERSAL_AI_PERSONALIZATION_SCHEMA_VERSION,
    personalizationId: safeString(source.personalizationId || lessonId) || lessonId,
    lessonId,
    curriculumId,
    language,
    personalizationLevel: safeString(source.personalizationLevel || 'intermediate') || 'intermediate',
    personalizedLearningPath: asArray(source.personalizedLearningPath),
    adaptiveRoadmap: isObject(source.adaptiveRoadmap) ? source.adaptiveRoadmap : { stages: [], sequence: [] },
    dailyStudyPlan: asArray(source.dailyStudyPlan),
    weeklyStudyPlan: asArray(source.weeklyStudyPlan),
    monthlyLearningPlan: asArray(source.monthlyLearningPlan),
    personalizedObjectives: asArray(source.personalizedObjectives),
    recommendedPractice: asArray(source.recommendedPractice),
    revisionSchedule: asArray(source.revisionSchedule),
    weakConceptRecoveryPlan: asArray(source.weakConceptRecoveryPlan),
    skillImprovementPlan: asArray(source.skillImprovementPlan),
    projectRecommendations: asArray(source.projectRecommendations),
    careerRecommendations: asArray(source.careerRecommendations),
    difficultyRecommendation: isObject(source.difficultyRecommendation) ? source.difficultyRecommendation : {
      currentLevel: 'intermediate',
      recommendedLevel: 'intermediate',
      score: 0.5
    },
    paceRecommendation: isObject(source.paceRecommendation) ? source.paceRecommendation : {
      paceScore: 0.5,
      recommendation: 'balanced',
      sessionsPerWeek: 5
    },
    motivationStrategy: isObject(source.motivationStrategy) ? source.motivationStrategy : {
      primaryGoal: 'steady-progress',
      strategy: 'milestone-driven-progress',
      reinforcement: 'deep-focus-blocks'
    },
    learningConfidence: clamp(source.learningConfidence ?? 0.5, 0, 1),
    masteryForecast: isObject(source.masteryForecast) ? source.masteryForecast : {
      projectedMastery: clamp(source.masteryForecast?.projectedMastery ?? 0.6, 0, 1),
      projectedWeeks: Math.max(2, toFiniteNumber(source.masteryForecast?.projectedWeeks, 8))
    },
    successProbability: clamp(source.successProbability ?? 0.6, 0, 1),
    personalizedMilestones: asArray(source.personalizedMilestones),
    adaptiveNotificationsMetadata: isObject(source.adaptiveNotificationsMetadata) ? source.adaptiveNotificationsMetadata : {
      cadence: 'balanced-reminder',
      channels: [],
      studyWindow: 'evening',
      triggerCount: 0
    },
    diagnostics: isObject(source.diagnostics) ? source.diagnostics : {
      unknownLevel: false,
      runtimeGraphNodeCount: 0,
      runtimeGraphRelationshipCount: 0,
      sessionEventCount: 0,
      timelineEventCount: 0,
      aiTeacherEventCount: 0,
      futureLearnerAttributes: []
    },
    synchronization: isObject(source.synchronization) ? source.synchronization : {
      integration: {
        universalLearningPipeline: { status: 'legacy', hasMetadata: false },
        lessonGenerator: { status: 'legacy', lessonId },
        curriculumEngine: { status: 'legacy', curriculumId },
        aiTeacher: { status: 'legacy', eventCount: 0 },
        assessmentEngine: { status: 'legacy', hasAssessment: false },
        learningAnalytics: { status: 'legacy', hasAnalytics: false },
        runtimeGraph: { status: 'legacy', nodeCount: 0, relationshipCount: 0 },
        timelineEngine: { status: 'legacy', eventCount: 0 }
      },
      continuousPersonalization: true,
      realtimeAdaptation: true,
      interruptedRecovery: true,
      offlineLearningEnabled: true,
      multiDeviceLearningEnabled: true,
      futureModelCompatible: true,
      versionCompatibility: {
        schemaVersion: UNIVERSAL_AI_PERSONALIZATION_SCHEMA_VERSION,
        backwardCompatible: true,
        forwardCompatible: true
      }
    }
  };
}

export function deserializeUniversalAIPersonalizationOutput(payload = '') {
  const parsed = parsePayload(payload);
  if (!parsed) {
    const fallback = migrateUniversalAIPersonalizationOutput({
      lessonId: 'recovered-lesson',
      curriculumId: 'recovered-curriculum'
    });

    return {
      output: fallback,
      validation: {
        valid: false,
        status: 'fallback',
        errors: ['Failed to parse personalization payload.'],
        warnings: []
      }
    };
  }

  const output = migrateUniversalAIPersonalizationOutput(parsed.output || parsed);
  return {
    output,
    validation: validateUniversalAIPersonalizationOutput(output)
  };
}

export class UniversalAIPersonalizationAdaptiveLearningEngine {
  constructor(runtime = {}, options = {}) {
    this.runtime = runtime;
    this.options = {
      ...DEFAULT_UNIVERSAL_AI_PERSONALIZATION_CONFIG,
      ...(isObject(options) ? options : {})
    };

    this.persistenceAdapter = this.options.persistenceAdapter || createDefaultPersistenceAdapter();
    this.persistenceKey = safeString(this.options.persistenceKey || DEFAULT_UNIVERSAL_AI_PERSONALIZATION_CONFIG.persistenceKey)
      || DEFAULT_UNIVERSAL_AI_PERSONALIZATION_CONFIG.persistenceKey;

    this.state = createDefaultState();
    this.recoverSession();
  }

  synchronizeOffline(deviceOperations = []) {
    const operations = asArray(deviceOperations)
      .filter((item) => isObject(item))
      .map((item, index) => ({
        id: safeString(item.id || `offline-op-${index + 1}`) || `offline-op-${index + 1}`,
        timestamp: Number(item.timestamp || Date.now()),
        type: safeString(item.type || 'personalization-offline-event') || 'personalization-offline-event',
        payload: item.payload || {}
      }));

    this.state.sync.offlineQueue = [...this.state.sync.offlineQueue, ...operations].slice(-this.options.maxHistory);
    this.state.sync.lastSyncedAt = Date.now();

    pushHistory(this.state, {
      type: 'offline-sync',
      operations: operations.length,
      timestamp: Date.now()
    }, this.options.maxHistory);

    return {
      queued: operations.length,
      pending: this.state.sync.offlineQueue.length
    };
  }

  synchronizeDevice(deviceId = 'unknown-device', snapshot = {}) {
    const key = safeString(deviceId) || 'unknown-device';
    const payload = isObject(snapshot) ? snapshot : {};

    this.state.sync.deviceSnapshots[key] = {
      ...payload,
      deviceId: key,
      syncedAt: Date.now()
    };
    this.state.sync.lastSyncedAt = Date.now();
    this.state.sync.lastDeviceId = key;

    pushHistory(this.state, {
      type: 'device-sync',
      deviceId: key,
      timestamp: Date.now()
    }, this.options.maxHistory);

    return {
      deviceId: key,
      totalDevices: Object.keys(this.state.sync.deviceSnapshots).length
    };
  }

  generate(input = {}) {
    if (asArray(input.offlineEvents).length > 0) {
      this.synchronizeOffline(input.offlineEvents);
    }

    if (isObject(input.deviceSync) && safeString(input.deviceSync.deviceId)) {
      this.synchronizeDevice(input.deviceSync.deviceId, input.deviceSync.snapshot || {});
    }

    const startedAt = Date.now();
    const output = buildAdaptiveOutput(this.runtime, input, this.options);
    output.synchronization.offlineSynchronization = {
      pendingOperations: this.state.sync.offlineQueue.length,
      lastSyncedAt: this.state.sync.lastSyncedAt
    };
    output.synchronization.multiDeviceSynchronization = {
      totalDevices: Object.keys(this.state.sync.deviceSnapshots).length,
      lastDeviceId: this.state.sync.lastDeviceId
    };

    const validation = validateUniversalAIPersonalizationOutput(output);

    this.state.output = output;
    this.state.status = validation.valid ? 'Ready' : 'Warning';
    this.state.diagnostics.runs += 1;
    this.state.diagnostics.latestDurationMs = Math.max(0, Date.now() - startedAt);
    this.state.diagnostics.warnings = [...this.state.diagnostics.warnings, ...validation.warnings].slice(-this.options.maxHistory);

    pushHistory(this.state, {
      type: 'personalization-generated',
      lessonId: output.lessonId,
      personalizationId: output.personalizationId,
      at: Date.now(),
      valid: validation.valid
    }, this.options.maxHistory);

    this.runtime.metadata = {
      ...(this.runtime.metadata || {}),
      personalizationAdaptiveAdapter: {
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
        pendingOfflineOperations: this.state.sync.offlineQueue.length,
        totalSynchronizedDevices: Object.keys(this.state.sync.deviceSnapshots).length
      }
    };
  }

  synchronize(reason = 'manual', input = {}) {
    const result = this.generate(input);
    pushHistory(this.state, {
      type: 'personalization-synchronized',
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
      timelineEvents: asArray(this.runtime?.sceneEventRuntime?.events)
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
      timelineEvents: asArray(this.runtime?.sceneEventRuntime?.events)
    });
  }

  persistSession(adapter = this.persistenceAdapter) {
    if (!adapter) return false;

    const payload = JSON.stringify({
      schemaVersion: UNIVERSAL_AI_PERSONALIZATION_SCHEMA_VERSION,
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
      sync: {
        ...createDefaultState().sync,
        ...(isObject(source.sync) ? source.sync : {})
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
      'personalization-generated',
      'personalization-synchronized',
      'personalization-persisted',
      'personalization-recovered',
      'personalization-destroyed'
    ];
  }
}

export function createUniversalAIPersonalizationAdaptiveLearningEngine(runtime = {}, options = {}) {
  return new UniversalAIPersonalizationAdaptiveLearningEngine(runtime, options);
}

export function runUniversalAIPersonalizationAdaptiveLearningEngine(input = {}, options = {}) {
  const runtime = isObject(options.runtime) ? options.runtime : {};
  const normalizedOptions = {
    ...options
  };
  delete normalizedOptions.runtime;

  const engine = createUniversalAIPersonalizationAdaptiveLearningEngine(runtime, normalizedOptions);
  return engine.generate(input);
}
