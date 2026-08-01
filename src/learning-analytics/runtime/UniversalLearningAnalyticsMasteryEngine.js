import {
  UNIVERSAL_LEARNING_ANALYTICS_SCHEMA_VERSION,
  SUPPORTED_ANALYTICS_WINDOWS,
  SUPPORTED_DASHBOARD_AUDIENCES,
  DEFAULT_UNIVERSAL_LEARNING_ANALYTICS_CONFIG,
  isObject,
  asArray,
  safeString,
  toFiniteNumber,
  clamp,
  normalizeAnalyticsWindow,
  normalizeDashboardAudience,
  normalizeLearningLevel
} from './UniversalLearningAnalyticsMasteryEngineConfig.js';

const STORE_KEY = '__daksha_universal_learning_analytics_mastery_store__';

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
      // Listener failures are isolated from analytics runtime.
    }
  });
}

function uniqueStrings(values = [], max = 240) {
  const out = [];
  const seen = new Set();
  asArray(values).forEach((value) => {
    const text = safeString(value);
    if (!text) return;
    const key = text.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(text);
  });
  return out.slice(0, max);
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

function getTimelineSummary(runtime = {}, input = {}) {
  const source = isObject(input.timeline) ? input.timeline : runtime?.metadata?.timeline || runtime?.sceneJson?.timeline || {};
  return {
    timelineId: safeString(source.timelineId || runtime?.sceneId || ''),
    version: safeString(source.version || 'v2') || 'v2',
    trackIds: asArray(source.trackIds),
    clipIds: asArray(source.clipIds),
    markerIds: asArray(source.markerIds),
    eventIds: asArray(source.eventIds)
  };
}

function getLessonGraph(runtime = {}, input = {}) {
  const direct = isObject(input.lessonGraph) ? input.lessonGraph : null;
  if (direct) return direct;

  const metadataGraph = runtime?.metadata?.lessonGraph;
  if (isObject(metadataGraph)) return metadataGraph;

  return {
    schemaVersion: UNIVERSAL_LEARNING_ANALYTICS_SCHEMA_VERSION,
    lessonId: safeString(runtime?.sceneId || 'runtime-lesson') || 'runtime-lesson',
    title: safeString(runtime?.metadata?.title || 'Runtime Lesson') || 'Runtime Lesson',
    language: safeString(runtime?.metadata?.language || 'English') || 'English',
    learningObjectives: uniqueStrings(asArray(runtime?.metadata?.learningObjectives), 120),
    keyConcepts: uniqueStrings(asArray(runtime?.metadata?.keyConcepts), 240),
    timelineSteps: asArray(runtime?.metadata?.timelineData?.clips).map((clip, index) => ({
      id: safeString(clip?.id || `step-${index + 1}`) || `step-${index + 1}`,
      title: safeString(clip?.metadata?.title || clip?.id || `Step ${index + 1}`) || `Step ${index + 1}`,
      order: index + 1,
      startMs: Math.max(0, toFiniteNumber(clip?.start, index * 1000)),
      endMs: Math.max(0, toFiniteNumber(clip?.end, (index + 1) * 1000)),
      durationMs: Math.max(0, toFiniteNumber(clip?.duration, 1000))
    })),
    lessonGraph: {
      nodes: asArray(runtime?.graph?.toJSON?.()?.nodes),
      edges: asArray(runtime?.graph?.toJSON?.()?.edges)
    }
  };
}

function resolveUserLearningProfile(input = {}, runtime = {}) {
  const source = isObject(input.userLearningProfile) ? input.userLearningProfile : {};
  const normalizedLevel = normalizeLearningLevel(source.learningLevel || source.level || source.proficiency || 'intermediate');

  return {
    learningLevel: normalizedLevel.level,
    knownLearningLevel: normalizedLevel.known,
    language: safeString(source.language || runtime?.metadata?.language || 'English') || 'English',
    confidence: clamp(source.confidence ?? source.learningConfidence ?? 0.6, 0, 1),
    pace: clamp(source.pace ?? source.learningPace ?? 1, 0.4, 2.2),
    learningGoals: uniqueStrings(asArray(source.learningGoals), 80),
    weakConcepts: uniqueStrings(asArray(source.weakConcepts), 120),
    strongConcepts: uniqueStrings(asArray(source.strongConcepts), 120),
    preferredWindows: uniqueStrings(asArray(source.analyticsWindows), 20),
    preferredDashboards: uniqueStrings(asArray(source.dashboardAudiences), 20)
  };
}

function resolveSessionHistory(input = {}, runtime = {}, state = {}) {
  const explicit = asArray(input.sessionHistory);
  if (explicit.length) return explicit;

  const runtimeSessions = asArray(runtime?.metadata?.sessionHistory);
  if (runtimeSessions.length) return runtimeSessions;

  const previousEvents = asArray(state?.history?.recentEvents)
    .filter((entry) => entry?.type === 'analytics-run' || entry?.type === 'device-sync' || entry?.type === 'offline-sync')
    .map((entry, index) => ({
      sessionId: safeString(entry?.sessionId || `derived-session-${index + 1}`) || `derived-session-${index + 1}`,
      date: Number(entry?.timestamp || Date.now()),
      durationMinutes: Math.max(1, toFiniteNumber(entry?.durationMinutes, 20)),
      active: true,
      confidence: clamp(entry?.confidence, 0, 1),
      engagement: clamp(entry?.engagement, 0, 1),
      retention: clamp(entry?.retention, 0, 1),
      conceptsCovered: asArray(entry?.conceptsCovered),
      completedItems: Math.max(0, toFiniteNumber(entry?.completedItems, 0))
    }));

  return previousEvents;
}

function resolveAITeacherEvents(input = {}, runtime = {}) {
  const direct = asArray(input.aiTeacherEvents);
  if (direct.length) return direct;

  const sceneEvents = asArray(runtime?.sceneEventRuntime?.events || []).filter((event) => {
    const source = safeString(event?.source || '');
    return source === 'ai-teacher-engine' || source === 'ai-teacher-runtime';
  });

  if (sceneEvents.length) return sceneEvents;

  return asArray(runtime?.metadata?.aiTeacherAdapter?.runtimeState?.history?.recentEvents);
}

function resolveAssessmentResults(input = {}, runtime = {}) {
  const source = isObject(input.assessmentResults) ? input.assessmentResults : runtime?.metadata?.assessmentAdapter?.output || {};

  return {
    masteryScore: clamp(source.masteryScore ?? 0.5, 0, 1),
    completionScore: clamp(source.completionScore ?? 0.5, 0, 1),
    learningConfidence: clamp(source.learningConfidence ?? 0.5, 0, 1),
    questionBank: asArray(source.questionBank),
    weakAreaMap: asArray(source.weakAreaMap),
    knowledgeGaps: asArray(source.knowledgeGaps),
    recommendedNextLesson: safeString(source.recommendedNextLesson || 'Continue adaptive lesson path.') || 'Continue adaptive lesson path.',
    diagnostics: isObject(source.diagnostics) ? source.diagnostics : {}
  };
}

function resolveInteractionEvents(input = {}, runtime = {}) {
  const direct = asArray(input.interactionEvents);
  if (direct.length) return direct;

  const sceneEvents = asArray(runtime?.sceneEventRuntime?.events || []);
  return sceneEvents.filter((event) => {
    const type = safeString(event?.type || '').toLowerCase();
    const source = safeString(event?.source || '').toLowerCase();
    return type.includes('interaction') || source.includes('interaction');
  });
}

function resolveAnalyticsWindows(profile = {}, input = {}) {
  const candidates = uniqueStrings([
    ...asArray(input.analyticsWindows),
    ...asArray(profile.preferredWindows),
    ...SUPPORTED_ANALYTICS_WINDOWS
  ], 40);

  const normalized = candidates.map((value) => normalizeAnalyticsWindow(value));
  const seen = new Set();
  const windows = [];
  normalized.forEach((entry) => {
    if (seen.has(entry.window)) return;
    seen.add(entry.window);
    windows.push(entry);
  });

  return windows;
}

function resolveDashboardAudiences(profile = {}, input = {}) {
  const candidates = uniqueStrings([
    ...asArray(input.dashboardAudiences),
    ...asArray(profile.preferredDashboards),
    ...SUPPORTED_DASHBOARD_AUDIENCES
  ], 40);

  const normalized = candidates.map((value) => normalizeDashboardAudience(value));
  const seen = new Set();
  const audiences = [];
  normalized.forEach((entry) => {
    if (seen.has(entry.audience)) return;
    seen.add(entry.audience);
    audiences.push(entry);
  });

  return audiences;
}

function buildConceptUniverse(lessonGraph = {}, assessment = {}, profile = {}) {
  const fromLesson = [...asArray(lessonGraph.learningObjectives), ...asArray(lessonGraph.keyConcepts)];
  const fromAssessment = [
    ...asArray(assessment.questionBank).map((question) => question?.concept),
    ...asArray(assessment.weakAreaMap).map((entry) => entry?.concept),
    ...asArray(assessment.knowledgeGaps).map((entry) => entry?.concept)
  ];
  const fromProfile = [...asArray(profile.weakConcepts), ...asArray(profile.strongConcepts)];

  return uniqueStrings([...fromLesson, ...fromAssessment, ...fromProfile], 400);
}

function aggregateStudyTime(sessionHistory = []) {
  return asArray(sessionHistory).reduce((total, session) => {
    return total + Math.max(0, toFiniteNumber(session?.durationMinutes, 0));
  }, 0);
}

function computeStreak(sessionHistory = []) {
  const days = uniqueStrings(asArray(sessionHistory)
    .filter((session) => session?.active !== false)
    .map((session) => {
      const date = new Date(toFiniteNumber(session?.date, Date.now()));
      return `${date.getUTCFullYear()}-${date.getUTCMonth() + 1}-${date.getUTCDate()}`;
    }), 10000);

  if (days.length === 0) return 0;

  const sorted = days
    .map((text) => {
      const [year, month, day] = text.split('-').map((item) => Number(item || 0));
      return Date.UTC(year, month - 1, day);
    })
    .sort((left, right) => right - left);

  let streak = 1;
  for (let index = 1; index < sorted.length; index += 1) {
    const delta = sorted[index - 1] - sorted[index];
    if (delta === 24 * 60 * 60 * 1000) {
      streak += 1;
      continue;
    }
    break;
  }

  return streak;
}

function buildTimeAnalytics(windows = [], sessionHistory = [], progress = {}) {
  const totalMinutes = aggregateStudyTime(sessionHistory);
  const totalSessions = asArray(sessionHistory).length;
  const averageSessionMinutes = totalSessions > 0 ? totalMinutes / totalSessions : 0;
  const progressRatePerHour = totalMinutes > 0 ? ((clamp(progress.lessonCompletion, 0, 1) * 100) / (totalMinutes / 60)) : 0;

  const windowMetrics = {};
  windows.forEach((entry) => {
    const key = entry.window;
    windowMetrics[key] = {
      knownWindow: entry.known,
      activeMinutes: totalMinutes,
      sessionCount: totalSessions,
      averageSessionMinutes,
      progressRatePerHour,
      consistencyScore: clamp(totalSessions / 30, 0, 1)
    };
  });

  return {
    totalMinutes,
    totalSessions,
    averageSessionMinutes,
    progressRatePerHour,
    windows: windowMetrics
  };
}

function buildConceptCoverage(concepts = [], assessment = {}, sessionHistory = [], profile = {}) {
  const weakSet = new Set(asArray(profile.weakConcepts).map((item) => safeString(item).toLowerCase()));
  const strongSet = new Set(asArray(profile.strongConcepts).map((item) => safeString(item).toLowerCase()));
  const weakArea = new Map(
    asArray(assessment.weakAreaMap).map((entry) => [
      safeString(entry?.concept).toLowerCase(),
      clamp(entry?.weaknessScore, 0, 1)
    ])
  );

  const coveredConcepts = new Set();
  asArray(sessionHistory).forEach((session) => {
    asArray(session?.conceptsCovered).forEach((concept) => {
      coveredConcepts.add(safeString(concept).toLowerCase());
    });
  });

  const output = concepts.map((concept, index) => {
    const key = safeString(concept).toLowerCase();
    const weakness = clamp(weakArea.get(key) ?? (weakSet.has(key) ? 0.75 : 0.2), 0, 1);
    const coverage = coveredConcepts.has(key) ? 1 : clamp(0.35 - (weakness * 0.2), 0, 1);
    const mastery = clamp((coverage * 0.55) + ((1 - weakness) * 0.45) + (strongSet.has(key) ? 0.1 : 0), 0, 1);

    return {
      id: `concept-${index + 1}`,
      concept,
      coverage,
      mastery,
      status: mastery >= 0.72 ? 'strong' : mastery >= 0.5 ? 'moderate' : 'weak'
    };
  });

  return output;
}

function deriveProgressMetrics({ lessonGraph = {}, timeline = {}, assessment = {}, interactions = [], sessionHistory = [], conceptCoverage = [] }) {
  const clipCount = Math.max(1, asArray(timeline.clipIds).length || asArray(lessonGraph.timelineSteps).length || 1);
  const completedItems = asArray(sessionHistory).reduce((sum, session) => sum + Math.max(0, toFiniteNumber(session?.completedItems, 0)), 0);
  const questionCount = Math.max(1, asArray(assessment.questionBank).length || 1);

  const lessonCompletion = clamp(
    ((assessment.completionScore * 0.45) + (Math.min(completedItems, clipCount) / clipCount * 0.35) + (asArray(interactions).length > 0 ? 0.2 : 0)),
    0,
    1
  );

  const chapterCompletion = clamp((Math.min(completedItems, clipCount) / clipCount), 0, 1);
  const topicCompletion = clamp(conceptCoverage.filter((entry) => entry.coverage >= 0.5).length / Math.max(1, conceptCoverage.length), 0, 1);
  const conceptMastery = clamp(conceptCoverage.reduce((sum, entry) => sum + entry.mastery, 0) / Math.max(1, conceptCoverage.length), 0, 1);

  const quizPerformance = {
    score: assessment.masteryScore,
    completionScore: assessment.completionScore,
    confidence: assessment.learningConfidence,
    questionCount,
    attemptedCount: Math.min(questionCount, Math.max(0, toFiniteNumber(completedItems, 0)))
  };

  return {
    lessonCompletion,
    chapterCompletion,
    topicCompletion,
    conceptMastery,
    quizPerformance,
    interactionHistory: {
      totalEvents: asArray(interactions).length,
      recentEvents: asArray(interactions).slice(-80)
    },
    practiceHistory: {
      attempts: Math.max(0, toFiniteNumber(completedItems, 0)),
      sessions: asArray(sessionHistory).length
    },
    revisionHistory: {
      totalRevisions: asArray(sessionHistory).reduce((sum, session) => sum + Math.max(0, toFiniteNumber(session?.revisionCount, 0)), 0),
      sessions: asArray(sessionHistory).filter((session) => toFiniteNumber(session?.revisionCount, 0) > 0).length
    },
    learningStreak: computeStreak(sessionHistory),
    engagement: clamp((asArray(interactions).length / 40) + (asArray(sessionHistory).length / 20), 0, 1),
    retentionPrediction: clamp((assessment.masteryScore * 0.5) + (assessment.learningConfidence * 0.2) + (computeStreak(sessionHistory) / 30 * 0.3), 0, 1)
  };
}

function deriveWeakAndStrongAreas(conceptCoverage = [], assessment = {}, profile = {}) {
  const weakFromCoverage = conceptCoverage.filter((entry) => entry.status === 'weak');
  const strongFromCoverage = conceptCoverage.filter((entry) => entry.status === 'strong');

  const weakFromAssessment = asArray(assessment.weakAreaMap).map((entry) => ({
    concept: safeString(entry?.concept || 'Unknown Concept') || 'Unknown Concept',
    weaknessScore: clamp(entry?.weaknessScore, 0, 1),
    status: safeString(entry?.status || 'weak') || 'weak'
  }));

  const weakMap = new Map();
  weakFromCoverage.forEach((entry) => {
    weakMap.set(entry.concept.toLowerCase(), {
      concept: entry.concept,
      weaknessScore: clamp(1 - entry.mastery, 0, 1),
      status: 'weak'
    });
  });

  weakFromAssessment.forEach((entry) => {
    const key = entry.concept.toLowerCase();
    const existing = weakMap.get(key);
    if (!existing || existing.weaknessScore < entry.weaknessScore) {
      weakMap.set(key, entry);
    }
  });

  asArray(profile.weakConcepts).forEach((concept) => {
    const text = safeString(concept);
    if (!text) return;
    const key = text.toLowerCase();
    if (!weakMap.has(key)) {
      weakMap.set(key, {
        concept: text,
        weaknessScore: 0.7,
        status: 'weak'
      });
    }
  });

  const strongAreas = uniqueStrings([
    ...strongFromCoverage.map((entry) => entry.concept),
    ...asArray(profile.strongConcepts)
  ], 200).map((concept, index) => ({
    id: `strong-area-${index + 1}`,
    concept,
    strengthScore: clamp(conceptCoverage.find((entry) => entry.concept === concept)?.mastery ?? 0.75, 0, 1)
  }));

  const weakAreas = Array.from(weakMap.values())
    .sort((left, right) => right.weaknessScore - left.weaknessScore)
    .slice(0, 120)
    .map((entry, index) => ({
      id: `weak-area-${index + 1}`,
      ...entry
    }));

  return {
    weakAreas,
    strongAreas
  };
}

function buildKnowledgeGraphProgress(lessonGraph = {}, runtimeGraph = {}, conceptCoverage = []) {
  const lessonNodes = asArray(lessonGraph?.lessonGraph?.nodes);
  const lessonEdges = asArray(lessonGraph?.lessonGraph?.edges);
  const coveredConcepts = conceptCoverage.filter((entry) => entry.coverage >= 0.5).length;

  return {
    nodeCoverage: clamp(coveredConcepts / Math.max(1, lessonNodes.length || conceptCoverage.length), 0, 1),
    edgeCoverage: clamp(conceptCoverage.filter((entry) => entry.mastery >= 0.5).length / Math.max(1, lessonEdges.length || conceptCoverage.length), 0, 1),
    runtimeGraphNodeCount: Math.max(0, toFiniteNumber(runtimeGraph.nodeCount, 0)),
    runtimeGraphRelationshipCount: Math.max(0, toFiniteNumber(runtimeGraph.relationshipCount, 0)),
    lessonGraphNodeCount: lessonNodes.length,
    lessonGraphRelationshipCount: lessonEdges.length
  };
}

function buildSkillGrowth(conceptCoverage = [], sessionHistory = [], progress = {}) {
  const baseline = clamp(progress.quizPerformance.score - 0.2, 0, 1);
  const current = clamp(progress.conceptMastery, 0, 1);
  const delta = clamp(current - baseline, -1, 1);

  return {
    baselineScore: baseline,
    currentScore: current,
    growthDelta: delta,
    growthRate: clamp(delta + (asArray(sessionHistory).length / 100), -1, 1),
    improvedConceptCount: conceptCoverage.filter((entry) => entry.mastery >= 0.6).length
  };
}

function buildLearningVelocity(progress = {}, timeAnalytics = {}) {
  const hours = Math.max(0.1, toFiniteNumber(timeAnalytics.totalMinutes, 0) / 60);
  const completionPerHour = (progress.lessonCompletion * 100) / hours;
  const masteryPerHour = (progress.conceptMastery * 100) / hours;

  return {
    completionPerHour,
    masteryPerHour,
    overallVelocityScore: clamp(((completionPerHour / 100) * 0.5) + ((masteryPerHour / 100) * 0.5), 0, 1)
  };
}

function buildConfidenceTrend(sessionHistory = [], assessment = {}, profile = {}) {
  const points = asArray(sessionHistory)
    .slice(-40)
    .map((session, index) => ({
      id: `confidence-point-${index + 1}`,
      at: Number(session?.date || Date.now()),
      confidence: clamp(session?.confidence ?? assessment.learningConfidence ?? profile.confidence, 0, 1)
    }));

  const latest = points.at(-1)?.confidence ?? assessment.learningConfidence;
  const first = points[0]?.confidence ?? assessment.learningConfidence;

  return {
    points,
    currentConfidence: clamp((latest * 0.7) + (assessment.learningConfidence * 0.3), 0, 1),
    trend: latest >= first ? 'upward' : 'downward',
    delta: clamp(latest - first, -1, 1)
  };
}

function buildRevisionSchedule(weakAreas = [], timeAnalytics = {}, profile = {}) {
  const baseMinutes = Math.max(15, Math.round((timeAnalytics.averageSessionMinutes || 25) * 0.6));

  return weakAreas.slice(0, 80).map((area, index) => {
    const difficultyFactor = 1 + clamp(area.weaknessScore, 0, 1);
    const intervalDays = Math.max(1, Math.round((index < 3 ? 1 : index < 8 ? 3 : 7) * difficultyFactor));
    return {
      id: `revision-${index + 1}`,
      concept: area.concept,
      weaknessScore: area.weaknessScore,
      recommendedInDays: intervalDays,
      estimatedMinutes: Math.max(10, Math.round(baseMinutes * difficultyFactor)),
      language: profile.language || 'English'
    };
  });
}

function buildRecommendations({ weakAreas = [], strongAreas = [], velocity = {}, progress = {}, assessment = {}, profile = {}, config = {} }) {
  const recommendations = [];

  weakAreas.slice(0, 12).forEach((area, index) => {
    recommendations.push({
      id: `recommendation-weak-${index + 1}`,
      type: 'targeted-revision',
      priority: index + 1,
      concept: area.concept,
      message: `Revise ${area.concept} with adaptive practice and reflection prompts.`,
      expectedImpact: clamp(0.4 + (area.weaknessScore * 0.5), 0, 1)
    });
  });

  if (velocity.overallVelocityScore < 0.45) {
    recommendations.push({
      id: 'recommendation-pace-recalibration',
      type: 'pace-adjustment',
      priority: recommendations.length + 1,
      message: 'Reduce difficulty pace temporarily and add short guided checkpoints.',
      expectedImpact: 0.72
    });
  }

  if (progress.learningStreak < 3) {
    recommendations.push({
      id: 'recommendation-streak',
      type: 'streak-builder',
      priority: recommendations.length + 1,
      message: 'Maintain a daily learning streak with one micro-session per day.',
      expectedImpact: 0.68
    });
  }

  if (assessment.masteryScore >= 0.75 && strongAreas.length > 0) {
    recommendations.push({
      id: 'recommendation-advance',
      type: 'advance-level',
      priority: recommendations.length + 1,
      message: `Advance into higher-order applications of ${strongAreas[0].concept}.`,
      expectedImpact: 0.64
    });
  }

  if (asArray(profile.learningGoals).length > 0) {
    recommendations.push({
      id: 'recommendation-goal-alignment',
      type: 'goal-alignment',
      priority: recommendations.length + 1,
      message: `Align next practice cycle with learning goal: ${profile.learningGoals[0]}.`,
      expectedImpact: 0.66
    });
  }

  return recommendations.slice(0, Math.max(1, toFiniteNumber(config.maxRecommendations, 40)));
}

function buildNextLearningPath({ weakAreas = [], strongAreas = [], recommendations = [], assessment = {}, progress = {} }) {
  const steps = [];

  weakAreas.slice(0, 5).forEach((area, index) => {
    steps.push({
      id: `path-step-weak-${index + 1}`,
      type: 'reinforce-concept',
      concept: area.concept,
      goal: 'stabilize-mastery',
      suggestedDifficulty: progress.conceptMastery >= 0.65 ? 'intermediate' : 'beginner'
    });
  });

  strongAreas.slice(0, 3).forEach((area, index) => {
    steps.push({
      id: `path-step-strong-${index + 1}`,
      type: 'extend-concept',
      concept: area.concept,
      goal: 'deep-application',
      suggestedDifficulty: assessment.masteryScore >= 0.8 ? 'expert' : 'advanced'
    });
  });

  recommendations.slice(0, 4).forEach((recommendation, index) => {
    steps.push({
      id: `path-step-rec-${index + 1}`,
      type: recommendation.type,
      concept: recommendation.concept || 'general-learning-path',
      goal: 'recommendation-driven',
      suggestedDifficulty: 'adaptive'
    });
  });

  return {
    primaryPath: steps,
    nextLessonHint: assessment.recommendedNextLesson,
    readinessScore: clamp((progress.conceptMastery * 0.5) + (assessment.masteryScore * 0.5), 0, 1)
  };
}

function buildAdaptiveAnalytics({ progress = {}, recommendations = [], assessment = {}, velocity = {}, revisionSchedule = [], profile = {} }) {
  const masteryTarget = clamp((progress.conceptMastery * 0.6) + (assessment.masteryScore * 0.4), 0, 1);
  const pacing = velocity.overallVelocityScore >= 0.7 ? 'accelerate' : velocity.overallVelocityScore <= 0.4 ? 'stabilize' : 'balanced';
  const difficulty = masteryTarget >= 0.8 ? 'increase' : masteryTarget <= 0.45 ? 'decrease' : 'maintain';

  return {
    mastery: {
      current: masteryTarget,
      targetNextCycle: clamp(masteryTarget + 0.08, 0, 1)
    },
    recommendations: {
      count: recommendations.length,
      priorityFocus: recommendations[0]?.type || 'maintain-progress'
    },
    pacing,
    difficulty,
    revisionIntervals: revisionSchedule.slice(0, 8).map((item) => ({
      concept: item.concept,
      days: item.recommendedInDays
    })),
    learningGoals: {
      activeGoals: asArray(profile.learningGoals),
      generatedGoal: masteryTarget >= 0.75 ? 'advance-to-next-complexity-layer' : 'strengthen-core-concepts'
    }
  };
}

function buildDashboards({ audiences = [], progress = {}, masteryScore = 0, knowledgeGraphProgress = {}, weakAreas = [], strongAreas = [], recommendations = [], timeAnalytics = {}, confidenceTrend = {}, adaptiveAnalytics = {} }) {
  const dashboards = {};

  audiences.forEach((entry) => {
    const audience = entry.audience;

    if (audience === 'learner') {
      dashboards.learner = {
        knownAudience: entry.known,
        progress,
        masteryScore,
        weakAreas: weakAreas.slice(0, 6),
        strongAreas: strongAreas.slice(0, 6),
        recommendations: recommendations.slice(0, 6),
        confidenceTrend,
        nextActions: recommendations.slice(0, 3).map((item) => item.message)
      };
      return;
    }

    if (audience === 'teacher') {
      dashboards.teacher = {
        knownAudience: entry.known,
        masteryScore,
        conceptMastery: progress.conceptMastery,
        knowledgeGraphProgress,
        engagement: progress.engagement,
        retentionPrediction: progress.retentionPrediction,
        interventionTargets: weakAreas.slice(0, 10),
        adaptiveAnalytics
      };
      return;
    }

    if (audience === 'parent') {
      dashboards.parent = {
        knownAudience: entry.known,
        lessonCompletion: progress.lessonCompletion,
        learningStreak: progress.learningStreak,
        confidence: confidenceTrend.currentConfidence,
        revisionHighlights: weakAreas.slice(0, 4).map((item) => item.concept),
        encouragementTips: recommendations.slice(0, 4).map((item) => item.message)
      };
      return;
    }

    if (audience === 'administrator') {
      dashboards.administrator = {
        knownAudience: entry.known,
        masteryScore,
        lessonCompletion: progress.lessonCompletion,
        engagement: progress.engagement,
        retentionPrediction: progress.retentionPrediction,
        studyTimeMinutes: timeAnalytics.totalMinutes,
        recommendationCount: recommendations.length,
        diagnosticsSummary: {
          weakAreaCount: weakAreas.length,
          strongAreaCount: strongAreas.length,
          confidenceTrend: confidenceTrend.trend
        }
      };
      return;
    }

    dashboards[audience] = {
      knownAudience: false,
      metrics: {
        masteryScore,
        lessonCompletion: progress.lessonCompletion,
        conceptMastery: progress.conceptMastery,
        engagement: progress.engagement,
        retentionPrediction: progress.retentionPrediction
      },
      recommendations: recommendations.slice(0, 6)
    };
  });

  return dashboards;
}

function buildFutureMetrics(input = {}, context = {}) {
  const rawMetrics = isObject(input.analyticsMetrics) ? input.analyticsMetrics : {};
  const metrics = {};

  Object.entries(rawMetrics).forEach(([key, value]) => {
    if (typeof value === 'number') {
      metrics[key] = Number(value);
      return;
    }

    if (Array.isArray(value)) {
      metrics[key] = {
        count: value.length,
        values: value
      };
      return;
    }

    if (isObject(value)) {
      metrics[key] = value;
      return;
    }

    metrics[key] = value;
  });

  metrics.derivedRuntimeSignals = {
    aiTeacherEventCount: asArray(context.aiTeacherEvents).length,
    interactionEventCount: asArray(context.interactionEvents).length,
    assessmentQuestionCount: asArray(context.assessment.questionBank).length
  };

  return metrics;
}

function buildOutput(context = {}) {
  const output = {
    schemaVersion: UNIVERSAL_LEARNING_ANALYTICS_SCHEMA_VERSION,
    lessonId: safeString(context.lessonGraph.lessonId || context.timeline.timelineId || 'runtime-lesson') || 'runtime-lesson',
    title: safeString(context.lessonGraph.title || 'Universal Learning Analytics') || 'Universal Learning Analytics',
    language: safeString(context.profile.language || context.lessonGraph.language || 'English') || 'English',
    analyticsWindows: context.analyticsWindows.map((entry) => entry.window),
    dashboards: context.dashboards,
    learningProgress: context.progress,
    masteryScore: context.masteryScore,
    knowledgeGraphProgress: context.knowledgeGraphProgress,
    weakAreas: context.weakAreas,
    strongAreas: context.strongAreas,
    conceptCoverage: context.conceptCoverage,
    timeAnalytics: context.timeAnalytics,
    skillGrowth: context.skillGrowth,
    learningVelocity: context.learningVelocity,
    confidenceTrend: context.confidenceTrend,
    revisionSchedule: context.revisionSchedule,
    personalizedRecommendations: context.recommendations,
    nextLearningPath: context.nextLearningPath,
    adaptiveAnalytics: context.adaptiveAnalytics,
    trackedMetrics: {
      lessonCompletion: context.progress.lessonCompletion,
      chapterCompletion: context.progress.chapterCompletion,
      topicCompletion: context.progress.topicCompletion,
      conceptMastery: context.progress.conceptMastery,
      quizPerformance: context.progress.quizPerformance,
      interactionHistory: context.progress.interactionHistory,
      practiceHistory: context.progress.practiceHistory,
      revisionHistory: context.progress.revisionHistory,
      learningStreak: context.progress.learningStreak,
      engagement: context.progress.engagement,
      retentionPrediction: context.progress.retentionPrediction
    },
    synchronization: {
      offlineSynchronization: context.sync.offlineSynchronization,
      multiDeviceSynchronization: context.sync.multiDeviceSynchronization,
      interruptedSessionRecovery: context.sync.interruptedSessionRecovery,
      progressMigration: context.sync.progressMigration,
      versionCompatibility: context.sync.versionCompatibility
    },
    futureMetrics: context.futureMetrics,
    diagnostics: {
      runtimeGraphNodeCount: context.runtimeGraph.nodeCount,
      runtimeGraphRelationshipCount: context.runtimeGraph.relationshipCount,
      timelineId: context.timeline.timelineId,
      unknownAnalyticsWindows: context.analyticsWindows.filter((entry) => !entry.known).map((entry) => entry.window),
      unknownDashboardAudiences: context.dashboardAudiences.filter((entry) => !entry.known).map((entry) => entry.audience),
      generatedAt: Date.now()
    }
  };

  return output;
}

export function validateUniversalLearningAnalyticsOutput(output = {}) {
  const source = isObject(output) ? output : {};
  const errors = [];
  const warnings = [];

  if (!safeString(source.lessonId)) errors.push('Missing lessonId.');
  if (!safeString(source.title)) errors.push('Missing title.');
  if (!isObject(source.learningProgress)) errors.push('Missing learningProgress.');
  if (typeof source.masteryScore !== 'number') errors.push('masteryScore must be a number.');
  if (!isObject(source.knowledgeGraphProgress)) errors.push('Missing knowledgeGraphProgress.');
  if (!Array.isArray(source.weakAreas)) errors.push('weakAreas must be an array.');
  if (!Array.isArray(source.strongAreas)) errors.push('strongAreas must be an array.');
  if (!Array.isArray(source.conceptCoverage)) errors.push('conceptCoverage must be an array.');
  if (!isObject(source.timeAnalytics)) errors.push('Missing timeAnalytics.');
  if (!isObject(source.skillGrowth)) errors.push('Missing skillGrowth.');
  if (!isObject(source.learningVelocity)) errors.push('Missing learningVelocity.');
  if (!isObject(source.confidenceTrend)) errors.push('Missing confidenceTrend.');
  if (!Array.isArray(source.revisionSchedule)) errors.push('revisionSchedule must be an array.');
  if (!Array.isArray(source.personalizedRecommendations)) errors.push('personalizedRecommendations must be an array.');
  if (!isObject(source.nextLearningPath)) errors.push('Missing nextLearningPath.');
  if (!isObject(source.adaptiveAnalytics)) errors.push('Missing adaptiveAnalytics.');
  if (!isObject(source.dashboards)) errors.push('Missing dashboards.');
  if (!isObject(source.synchronization)) errors.push('Missing synchronization.');

  const serialized = JSON.stringify(source);
  if (/three\.|threejs|rendererpayload|speechsynthesis|texttospeech|tts|chart/i.test(serialized)) {
    errors.push('Forbidden renderer, chart, or speech payload detected in analytics output.');
  }

  asArray(source.analyticsWindows).forEach((windowName) => {
    const normalized = normalizeAnalyticsWindow(windowName);
    if (!normalized.known) {
      warnings.push(`Unknown analytics window preserved: ${normalized.window}`);
    }
  });

  Object.keys(source.dashboards || {}).forEach((audience) => {
    const normalized = normalizeDashboardAudience(audience);
    if (!normalized.known) {
      warnings.push(`Unknown dashboard audience preserved: ${normalized.audience}`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    status: errors.length === 0 ? (warnings.length ? 'warning' : 'valid') : 'invalid'
  };
}

export function serializeUniversalLearningAnalyticsOutput(output = {}) {
  return JSON.stringify({
    schemaVersion: UNIVERSAL_LEARNING_ANALYTICS_SCHEMA_VERSION,
    serializedAt: Date.now(),
    output
  });
}

export function migrateUniversalLearningAnalyticsOutput(input = {}) {
  const source = isObject(input) ? input : {};

  if (safeString(source.schemaVersion) === UNIVERSAL_LEARNING_ANALYTICS_SCHEMA_VERSION && isObject(source.learningProgress)) {
    return source;
  }

  const completion = clamp(source?.progress?.lessonCompletion ?? source?.lessonCompletion ?? source?.completionScore ?? 0.5, 0, 1);
  const mastery = clamp(source.masteryScore ?? source?.progress?.conceptMastery ?? 0.5, 0, 1);

  return {
    schemaVersion: UNIVERSAL_LEARNING_ANALYTICS_SCHEMA_VERSION,
    lessonId: safeString(source.lessonId || source.id || 'legacy-lesson') || 'legacy-lesson',
    title: safeString(source.title || source.lessonTitle || 'Legacy Learning Analytics') || 'Legacy Learning Analytics',
    language: safeString(source.language || 'English') || 'English',
    analyticsWindows: asArray(source.analyticsWindows).length ? source.analyticsWindows : [...SUPPORTED_ANALYTICS_WINDOWS],
    dashboards: isObject(source.dashboards) ? source.dashboards : {
      learner: {
        lessonCompletion: completion,
        masteryScore: mastery
      }
    },
    learningProgress: isObject(source.learningProgress) ? source.learningProgress : {
      lessonCompletion: completion,
      chapterCompletion: clamp(completion * 0.9, 0, 1),
      topicCompletion: clamp(completion * 0.85, 0, 1),
      conceptMastery: mastery,
      quizPerformance: {
        score: mastery,
        completionScore: completion,
        confidence: clamp(source.learningConfidence ?? 0.5, 0, 1)
      },
      interactionHistory: {
        totalEvents: 0,
        recentEvents: []
      },
      practiceHistory: {
        attempts: 0,
        sessions: 0
      },
      revisionHistory: {
        totalRevisions: 0,
        sessions: 0
      },
      learningStreak: Math.max(0, toFiniteNumber(source.learningStreak, 0)),
      engagement: clamp(source.engagement ?? 0.5, 0, 1),
      retentionPrediction: clamp(source.retentionPrediction ?? 0.5, 0, 1)
    },
    masteryScore: mastery,
    knowledgeGraphProgress: isObject(source.knowledgeGraphProgress) ? source.knowledgeGraphProgress : {
      nodeCoverage: clamp(completion, 0, 1),
      edgeCoverage: clamp(mastery, 0, 1),
      runtimeGraphNodeCount: 0,
      runtimeGraphRelationshipCount: 0,
      lessonGraphNodeCount: 0,
      lessonGraphRelationshipCount: 0
    },
    weakAreas: asArray(source.weakAreas),
    strongAreas: asArray(source.strongAreas),
    conceptCoverage: asArray(source.conceptCoverage),
    timeAnalytics: isObject(source.timeAnalytics) ? source.timeAnalytics : {
      totalMinutes: Math.max(0, toFiniteNumber(source.totalMinutes, 0)),
      totalSessions: 0,
      averageSessionMinutes: 0,
      progressRatePerHour: 0,
      windows: {}
    },
    skillGrowth: isObject(source.skillGrowth) ? source.skillGrowth : {
      baselineScore: clamp(mastery - 0.1, 0, 1),
      currentScore: mastery,
      growthDelta: 0,
      growthRate: 0,
      improvedConceptCount: 0
    },
    learningVelocity: isObject(source.learningVelocity) ? source.learningVelocity : {
      completionPerHour: 0,
      masteryPerHour: 0,
      overallVelocityScore: 0
    },
    confidenceTrend: isObject(source.confidenceTrend) ? source.confidenceTrend : {
      points: [],
      currentConfidence: clamp(source.learningConfidence ?? 0.5, 0, 1),
      trend: 'stable',
      delta: 0
    },
    revisionSchedule: asArray(source.revisionSchedule),
    personalizedRecommendations: asArray(source.personalizedRecommendations),
    nextLearningPath: isObject(source.nextLearningPath) ? source.nextLearningPath : {
      primaryPath: [],
      nextLessonHint: safeString(source.recommendedNextLesson || 'Continue adaptive lesson path.') || 'Continue adaptive lesson path.',
      readinessScore: mastery
    },
    adaptiveAnalytics: isObject(source.adaptiveAnalytics) ? source.adaptiveAnalytics : {
      mastery: {
        current: mastery,
        targetNextCycle: clamp(mastery + 0.08, 0, 1)
      },
      recommendations: {
        count: asArray(source.personalizedRecommendations).length,
        priorityFocus: 'maintain-progress'
      },
      pacing: 'balanced',
      difficulty: 'maintain',
      revisionIntervals: [],
      learningGoals: {
        activeGoals: [],
        generatedGoal: 'strengthen-core-concepts'
      }
    },
    trackedMetrics: isObject(source.trackedMetrics) ? source.trackedMetrics : {},
    synchronization: isObject(source.synchronization) ? source.synchronization : {
      offlineSynchronization: {
        status: 'legacy',
        pendingOperations: 0
      },
      multiDeviceSynchronization: {
        status: 'legacy',
        deviceCount: 0
      },
      interruptedSessionRecovery: {
        interrupted: false,
        checkpointId: null
      },
      progressMigration: {
        fromVersion: safeString(source.schemaVersion || 'legacy') || 'legacy',
        toVersion: UNIVERSAL_LEARNING_ANALYTICS_SCHEMA_VERSION,
        migrated: true
      },
      versionCompatibility: {
        schemaVersion: UNIVERSAL_LEARNING_ANALYTICS_SCHEMA_VERSION,
        backwardCompatible: true
      }
    },
    futureMetrics: isObject(source.futureMetrics) ? source.futureMetrics : {},
    diagnostics: isObject(source.diagnostics) ? source.diagnostics : {}
  };
}

export function deserializeUniversalLearningAnalyticsOutput(payload = '') {
  const parsed = parsePayload(payload);
  if (!parsed) {
    const fallback = migrateUniversalLearningAnalyticsOutput({
      lessonId: 'recovered-analytics',
      title: 'Recovered Learning Analytics'
    });

    return {
      output: fallback,
      validation: {
        valid: false,
        status: 'fallback',
        errors: ['Failed to parse analytics payload.'],
        warnings: []
      }
    };
  }

  const output = migrateUniversalLearningAnalyticsOutput(parsed.output || parsed);
  return {
    output,
    validation: validateUniversalLearningAnalyticsOutput(output)
  };
}

function createDefaultState() {
  return {
    schemaVersion: UNIVERSAL_LEARNING_ANALYTICS_SCHEMA_VERSION,
    status: 'Ready',
    output: null,
    diagnostics: {
      runs: 0,
      recoveries: 0,
      persistedSessions: 0,
      emittedEvents: 0,
      warnings: []
    },
    sync: {
      offlineQueue: [],
      deviceSnapshots: {},
      lastSyncedAt: 0,
      lastDeviceId: null,
      migrationVersion: UNIVERSAL_LEARNING_ANALYTICS_SCHEMA_VERSION
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

export class UniversalLearningAnalyticsMasteryEngine {
  constructor(runtime = {}, options = {}) {
    this.runtime = runtime;
    this.options = {
      ...DEFAULT_UNIVERSAL_LEARNING_ANALYTICS_CONFIG,
      ...(isObject(options) ? options : {})
    };

    this.scheduler = runtime?.timelineScheduler || runtime?.sceneScheduler || null;
    this.sceneEventRuntime = runtime?.sceneEventRuntime || runtime?.sceneEventSystem || null;
    this.timelineSynchronizationRuntime = runtime?.timelineSynchronizationRuntime || null;
    this.aiTeacherRuntime = runtime?.aiTeacherRuntime || null;
    this.assessmentRuntime = runtime?.assessmentRuntime || null;
    this.interactionContractRuntime = runtime?.interactionContractRuntime || null;

    this.persistenceAdapter = this.options.persistenceAdapter || this.scheduler?.persistenceAdapter || createDefaultPersistenceAdapter();
    this.persistenceKey = safeString(this.options.persistenceKey || DEFAULT_UNIVERSAL_LEARNING_ANALYTICS_CONFIG.persistenceKey)
      || DEFAULT_UNIVERSAL_LEARNING_ANALYTICS_CONFIG.persistenceKey;

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
      throw new Error('UniversalLearningAnalyticsMasteryEngine listener must be a function.');
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
    const safeChannel = safeString(channel) || 'learning-analytics-event';
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

  emitRuntimeGraphEvent(eventName = 'LearningAnalyticsEvent', payload = {}) {
    const normalizedEventName = safeString(eventName) || 'LearningAnalyticsEvent';

    const sceneEvent = {
      id: `learning-analytics-event-${Date.now()}-${Math.round(Math.random() * 1000)}`,
      type: 'learning-analytics-runtime-event',
      timeMs: Math.max(0, toFiniteNumber(this.scheduler?.snapshot?.()?.clock?.timeMs, 0)),
      payload: {
        analytics: {
          schemaVersion: UNIVERSAL_LEARNING_ANALYTICS_SCHEMA_VERSION,
          eventName: normalizedEventName,
          payload,
          sceneId: this.runtime?.sceneId || null
        }
      },
      sourceRefId: normalizedEventName,
      source: 'learning-analytics-engine'
    };

    this.sceneEventRuntime?.dispatchEvent?.(sceneEvent, {
      trigger: 'learning-analytics-runtime',
      synthetic: true
    });

    this.state.diagnostics.emittedEvents += 1;
    pushHistory(this.state, {
      type: 'runtime-graph-event',
      eventName: normalizedEventName,
      timestamp: Date.now()
    }, this.options.maxHistory);

    this.emit('learning-analytics-runtime-event', {
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
      if (source === 'learning-analytics-engine') return;

      const type = safeString(event?.type || 'unknown');
      if (type.includes('interaction') || type.includes('assessment') || type.includes('ai-teacher')) {
        pushHistory(this.state, {
          type: 'scene-runtime-event',
          eventType: type,
          observedAt: Date.now()
        }, this.options.maxHistory);
      }
    });

    this.unsubscribers.push(unsubscribe);
  }

  synchronizeOffline(deviceOperations = []) {
    const operations = asArray(deviceOperations)
      .filter((item) => isObject(item))
      .map((item, index) => ({
        id: safeString(item.id || `offline-op-${index + 1}`) || `offline-op-${index + 1}`,
        timestamp: Number(item.timestamp || Date.now()),
        type: safeString(item.type || 'analytics-sync') || 'analytics-sync',
        payload: item.payload || {}
      }));

    this.state.sync.offlineQueue = [...this.state.sync.offlineQueue, ...operations].slice(-800);
    this.state.sync.lastSyncedAt = Date.now();

    pushHistory(this.state, {
      type: 'offline-sync',
      operations: operations.length,
      timestamp: Date.now()
    }, this.options.maxHistory);

    this.emitRuntimeGraphEvent('LearningAnalyticsOfflineSyncUpdated', {
      operationCount: operations.length,
      pendingOperations: this.state.sync.offlineQueue.length
    });

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

    this.emitRuntimeGraphEvent('LearningAnalyticsDeviceSynchronized', {
      deviceId: key,
      totalDevices: Object.keys(this.state.sync.deviceSnapshots).length
    });

    return {
      deviceId: key,
      totalDevices: Object.keys(this.state.sync.deviceSnapshots).length
    };
  }

  generate(input = {}) {
    const lessonGraph = getLessonGraph(this.runtime, input);
    const runtimeGraph = getRuntimeGraphSummary(this.runtime);
    const timeline = getTimelineSummary(this.runtime, input);
    const profile = resolveUserLearningProfile(input, this.runtime);
    const sessionHistory = resolveSessionHistory(input, this.runtime, this.state);
    const aiTeacherEvents = resolveAITeacherEvents(input, this.runtime);
    const assessment = resolveAssessmentResults(input, this.runtime);
    const interactionEvents = resolveInteractionEvents(input, this.runtime);
    const analyticsWindows = resolveAnalyticsWindows(profile, input);
    const dashboardAudiences = resolveDashboardAudiences(profile, input);

    if (asArray(input.offlineEvents).length > 0) {
      this.synchronizeOffline(input.offlineEvents);
    }

    if (isObject(input.deviceSync) && safeString(input.deviceSync.deviceId)) {
      this.synchronizeDevice(input.deviceSync.deviceId, input.deviceSync.snapshot || {});
    }

    const concepts = buildConceptUniverse(lessonGraph, assessment, profile).slice(0, this.options.maxConcepts);
    const conceptCoverage = buildConceptCoverage(concepts, assessment, sessionHistory, profile);
    const progress = deriveProgressMetrics({
      lessonGraph,
      timeline,
      assessment,
      interactions: interactionEvents,
      sessionHistory,
      conceptCoverage
    });

    const weakStrong = deriveWeakAndStrongAreas(conceptCoverage, assessment, profile);
    const masteryScore = clamp((progress.conceptMastery * 0.55) + (assessment.masteryScore * 0.45), 0, 1);
    const knowledgeGraphProgress = buildKnowledgeGraphProgress(lessonGraph, runtimeGraph, conceptCoverage);
    const timeAnalytics = buildTimeAnalytics(analyticsWindows, sessionHistory, progress);
    const skillGrowth = buildSkillGrowth(conceptCoverage, sessionHistory, progress);
    const learningVelocity = buildLearningVelocity(progress, timeAnalytics);
    const confidenceTrend = buildConfidenceTrend(sessionHistory, assessment, profile);
    const revisionSchedule = buildRevisionSchedule(weakStrong.weakAreas, timeAnalytics, profile);
    const recommendations = buildRecommendations({
      weakAreas: weakStrong.weakAreas,
      strongAreas: weakStrong.strongAreas,
      velocity: learningVelocity,
      progress,
      assessment,
      profile,
      config: this.options
    });
    const nextLearningPath = buildNextLearningPath({
      weakAreas: weakStrong.weakAreas,
      strongAreas: weakStrong.strongAreas,
      recommendations,
      assessment,
      progress
    });
    const adaptiveAnalytics = buildAdaptiveAnalytics({
      progress,
      recommendations,
      assessment,
      velocity: learningVelocity,
      revisionSchedule,
      profile
    });

    const sync = {
      offlineSynchronization: {
        status: this.state.sync.offlineQueue.length > 0 ? 'pending' : 'synchronized',
        pendingOperations: this.state.sync.offlineQueue.length,
        lastSyncedAt: this.state.sync.lastSyncedAt
      },
      multiDeviceSynchronization: {
        status: Object.keys(this.state.sync.deviceSnapshots).length > 0 ? 'synchronized' : 'single-device',
        deviceCount: Object.keys(this.state.sync.deviceSnapshots).length,
        lastDeviceId: this.state.sync.lastDeviceId,
        deviceSnapshots: this.state.sync.deviceSnapshots
      },
      interruptedSessionRecovery: {
        interrupted: this.state.recovery.interrupted,
        checkpointId: this.state.recovery.checkpointId,
        resumeTimeMs: this.state.recovery.resumeTimeMs,
        resumeCount: this.state.recovery.resumeCount
      },
      progressMigration: {
        fromVersion: safeString(input.sourceSchemaVersion || UNIVERSAL_LEARNING_ANALYTICS_SCHEMA_VERSION) || UNIVERSAL_LEARNING_ANALYTICS_SCHEMA_VERSION,
        toVersion: UNIVERSAL_LEARNING_ANALYTICS_SCHEMA_VERSION,
        migrated: true
      },
      versionCompatibility: {
        schemaVersion: UNIVERSAL_LEARNING_ANALYTICS_SCHEMA_VERSION,
        backwardCompatible: true,
        forwardCompatible: true
      }
    };

    const futureMetrics = buildFutureMetrics(input, {
      aiTeacherEvents,
      interactionEvents,
      assessment
    });

    const dashboards = buildDashboards({
      audiences: dashboardAudiences,
      progress,
      masteryScore,
      knowledgeGraphProgress,
      weakAreas: weakStrong.weakAreas,
      strongAreas: weakStrong.strongAreas,
      recommendations,
      timeAnalytics,
      confidenceTrend,
      adaptiveAnalytics
    });

    const output = buildOutput({
      lessonGraph,
      timeline,
      runtimeGraph,
      profile,
      analyticsWindows,
      dashboardAudiences,
      dashboards,
      progress,
      masteryScore,
      knowledgeGraphProgress,
      weakAreas: weakStrong.weakAreas,
      strongAreas: weakStrong.strongAreas,
      conceptCoverage,
      timeAnalytics,
      skillGrowth,
      learningVelocity,
      confidenceTrend,
      revisionSchedule,
      recommendations,
      nextLearningPath,
      adaptiveAnalytics,
      sync,
      futureMetrics
    });

    const validation = validateUniversalLearningAnalyticsOutput(output);

    this.state.output = output;
    this.state.status = validation.valid ? 'Ready' : 'Warning';
    this.state.diagnostics.runs += 1;
    validation.warnings.forEach((warning) => {
      this.state.diagnostics.warnings.push(warning);
    });

    while (this.state.diagnostics.warnings.length > this.options.maxHistory) {
      this.state.diagnostics.warnings.shift();
    }

    pushHistory(this.state, {
      type: 'analytics-run',
      sessionId: safeString(input.sessionId || `session-${Date.now()}`) || `session-${Date.now()}`,
      timestamp: Date.now(),
      durationMinutes: Math.max(1, Math.round(timeAnalytics.averageSessionMinutes || 20)),
      confidence: confidenceTrend.currentConfidence,
      engagement: progress.engagement,
      retention: progress.retentionPrediction,
      conceptsCovered: conceptCoverage.slice(0, 10).map((entry) => entry.concept),
      completedItems: Math.round(progress.lessonCompletion * 100)
    }, this.options.maxHistory);

    this.runtime.metadata = {
      ...(this.runtime.metadata || {}),
      learningAnalyticsAdapter: {
        ...(this.runtime.metadata?.learningAnalyticsAdapter || {}),
        output,
        validation,
        runtimeState: this.snapshot(),
        aiTeacherEventCount: aiTeacherEvents.length,
        assessmentSummary: {
          masteryScore: assessment.masteryScore,
          completionScore: assessment.completionScore,
          confidence: assessment.learningConfidence
        },
        timelineState: this.timelineSynchronizationRuntime?.getSharedState?.()?.adapters?.learningAnalytics
          || this.runtime.metadata?.learningAnalyticsAdapter?.timelineState
          || {}
      }
    };

    this.emitRuntimeGraphEvent('LearningAnalyticsUpdated', {
      lessonId: output.lessonId,
      masteryScore: output.masteryScore,
      lessonCompletion: output.learningProgress.lessonCompletion,
      recommendationCount: output.personalizedRecommendations.length,
      weakAreaCount: output.weakAreas.length
    });

    this.emitRuntimeGraphEvent('LearningAnalyticsDashboardsReady', {
      audienceCount: Object.keys(output.dashboards).length,
      audiences: Object.keys(output.dashboards)
    });

    this.emitRuntimeGraphEvent('LearningAnalyticsAdaptiveSignalsReady', {
      pacing: output.adaptiveAnalytics.pacing,
      difficulty: output.adaptiveAnalytics.difficulty,
      goal: output.adaptiveAnalytics.learningGoals.generatedGoal
    });

    this.persistSession();

    return {
      output,
      validation,
      diagnostics: {
        analyticsWindows: analyticsWindows.map((entry) => entry.window),
        dashboardAudiences: dashboardAudiences.map((entry) => entry.audience),
        masteryScore,
        generatedAt: Date.now()
      }
    };
  }

  synchronize(reason = 'manual', input = {}) {
    const result = this.generate(input);
    this.emit('learning-analytics-synchronized', {
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

    this.emitRuntimeGraphEvent('LearningAnalyticsTimelineMutation', {
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

    this.emitRuntimeGraphEvent('LearningAnalyticsInterrupted', {
      reason,
      resumeTimeMs: this.state.recovery.resumeTimeMs
    });

    this.persistSession();
    return true;
  }

  resumeFromCheckpoint(checkpointId = null) {
    const resolved = safeString(checkpointId || this.state.recovery.checkpointId || '') || null;
    this.state.recovery.checkpointId = resolved;
    this.state.recovery.interrupted = false;
    this.state.recovery.resumeCount += 1;
    this.state.status = 'Ready';

    if (resolved && this.timelineSynchronizationRuntime?.resumeFromCheckpoint) {
      this.timelineSynchronizationRuntime.resumeFromCheckpoint(resolved);
    }

    this.emitRuntimeGraphEvent('LearningAnalyticsResumed', {
      checkpointId: resolved,
      resumeCount: this.state.recovery.resumeCount
    });

    return this.synchronize('resume-from-checkpoint', {
      progressState: {
        checkpointId: resolved,
        interrupted: false,
        resumeTimeMs: this.state.recovery.resumeTimeMs
      }
    });
  }

  persistSession(adapter = this.persistenceAdapter) {
    if (!adapter) return false;

    const payload = JSON.stringify({
      schemaVersion: UNIVERSAL_LEARNING_ANALYTICS_SCHEMA_VERSION,
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
    this.emit('learning-analytics-persisted', {
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
      sync: {
        ...createDefaultState().sync,
        ...(isObject(parsed?.state?.sync) ? parsed.state.sync : {}),
        migrationVersion: UNIVERSAL_LEARNING_ANALYTICS_SCHEMA_VERSION
      },
      recovery: {
        ...createDefaultState().recovery,
        ...(isObject(parsed?.state?.recovery) ? parsed.state.recovery : {}),
        interrupted: true
      }
    };

    this.emitRuntimeGraphEvent('LearningAnalyticsRecovered', {
      persistenceKey: this.persistenceKey,
      interrupted: true
    });

    this.emit('learning-analytics-recovered', {
      persistenceKey: this.persistenceKey
    });

    return true;
  }

  snapshot() {
    const state = deepClone(this.state);
    state.supportedAnalyticsWindows = [...SUPPORTED_ANALYTICS_WINDOWS];
    state.supportedDashboardAudiences = [...SUPPORTED_DASHBOARD_AUDIENCES];
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

    this.emit('learning-analytics-destroyed', {
      sceneId: this.runtime?.sceneId || null
    });
  }

  static supportedChannels() {
    return [
      'learning-analytics-runtime-event',
      'learning-analytics-synchronized',
      'learning-analytics-persisted',
      'learning-analytics-recovered',
      'learning-analytics-destroyed'
    ];
  }
}

export function createUniversalLearningAnalyticsMasteryEngine(runtime = {}, options = {}) {
  return new UniversalLearningAnalyticsMasteryEngine(runtime, options);
}

export function runUniversalLearningAnalyticsMasteryEngine(runtime = {}, input = {}, options = {}) {
  const engine = createUniversalLearningAnalyticsMasteryEngine(runtime, options);
  return engine.generate(input);
}
