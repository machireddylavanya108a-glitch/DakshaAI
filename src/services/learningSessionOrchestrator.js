import { saveLearningSessionProgress, saveMemoryBrain, saveProgressSnapshot, savePersonalizedLearningPlan, saveLessonPackage, saveDocumentAnalysis, saveQuizRecord } from './firestoreService.js';
import { buildAdaptiveAssessment } from '../utils/adaptiveAssessmentEngine.js';
import { buildPersonalizedLearningPlan } from '../utils/personalizedLearningEngine.js';
import { buildKnowledgeGraph } from '../utils/knowledgeGraphEngine.js';

function toPlainObject(value) {
  return value && typeof value === 'object' ? value : {};
}

function buildSessionId(sourceLabel = 'session', userId = '') {
  const safeUser = String(userId || 'anon').slice(0, 8);
  return `${safeUser}_${String(sourceLabel || 'session').toLowerCase().replace(/[^a-z0-9]+/g, '_')}_${Date.now()}`;
}

export async function persistLearningSession({
  user,
  sourceLabel = 'universal-learning',
  sourceContext = 'general',
  sessionData = {},
  assessmentContext = {},
  planContext = {}
} = {}) {
  if (!user?.uid) return null;

  const session = {
    sessionId: sessionData.sessionId || buildSessionId(sourceLabel, user.uid),
    sourceContext,
    sourceLabel,
    title: sessionData.title || sourceLabel,
    summary: sessionData.summary || '',
    topic: sessionData.topic || sourceLabel,
    difficulty: sessionData.difficulty || 'Medium',
    createdAt: sessionData.createdAt || new Date().toISOString(),
    updatedAtMs: Date.now(),
    sourceMeta: toPlainObject(sessionData.sourceMeta),
    learningSession: toPlainObject(sessionData.learningSession),
    lessonSuite: toPlainObject(sessionData.lessonSuite),
    plan: toPlainObject(sessionData.plan),
    memory: toPlainObject(sessionData.memory),
    progress: toPlainObject(sessionData.progress),
    assessment: toPlainObject(sessionData.assessment),
    interview: toPlainObject(sessionData.interview),
    teacher: toPlainObject(sessionData.teacher),
    roadmap: toPlainObject(sessionData.roadmap),
    graph: toPlainObject(sessionData.graph)
  };

  const plan = session.plan?.topic || planContext?.topic || sourceLabel;
  const assessment = buildAdaptiveAssessment({
    topic: plan,
    difficulty: session.difficulty,
    questionCount: assessmentContext.questionCount || 6,
    learnerProfile: assessmentContext.learnerProfile || {
      focus: planContext?.focus || 'general',
      strengths: planContext?.strengths || ['core concepts'],
      weaknesses: planContext?.weaknesses || ['key gaps'],
      learningStyle: planContext?.learningStyle || 'guided',
      goal: planContext?.goal || 'skill growth'
    }
  });

  const personalizedPlan = buildPersonalizedLearningPlan({
    interviewAnswers: toPlainObject(planContext.interviewAnswers || session.interview),
    sourceContext,
    sourceLabel,
    sourceSummary: session.summary,
    skillHint: plan || sourceLabel
  });

  const graph = buildKnowledgeGraph({
    topic: plan || session.topic || sourceLabel,
    prereqs: Array.isArray(session.learningSession?.keyConcepts) ? session.learningSession.keyConcepts.slice(0, 3) : [],
    relatedTopics: Array.isArray(session.learningSession?.keyConcepts) ? session.learningSession.keyConcepts.slice(0, 3) : [],
    advancedTopics: Array.isArray(session.lessonSuite?.learningRoadmap) ? session.lessonSuite.learningRoadmap.slice(0, 3) : [],
    revisions: Array.isArray(session.learningSession?.revisionNotes) ? session.learningSession.revisionNotes.slice(0, 3) : [],
    sourceText: session.summary
  });

  const sharedPayload = {
    ...session,
    assessment,
    plan: personalizedPlan,
    graph,
    memory: {
      topic: plan || session.topic || sourceLabel,
      summary: session.summary,
      concepts: Array.isArray(session.learningSession?.keyConcepts) ? session.learningSession.keyConcepts.slice(0, 8) : [],
      source: sourceContext
    },
    progress: {
      topic: plan || session.topic || sourceLabel,
      progressPercent: session.progress?.progressPercent || 12,
      recommendedNext: session.progress?.recommendedNext || session.learningSession?.progressUpdate?.recommendedNext || 'Continue learning',
      status: session.progress?.status || 'ready_to_start'
    },
    teacher: {
      ...(session.teacher || {}),
      script: session.learningSession?.aiTeacher?.script || session.summary,
      language: session.sourceMeta?.language || 'English',
      style: session.learningSession?.aiTeacher?.style || 'adaptive'
    },
    roadmap: {
      ...toPlainObject(session.roadmap),
      topic: plan || session.topic || sourceLabel,
      plan: personalizedPlan
    }
  };

  await Promise.all([
    saveLearningSessionProgress(user.uid, sharedPayload),
    saveMemoryBrain(user.uid, sharedPayload.memory),
    saveProgressSnapshot(user.uid, sharedPayload.progress),
    savePersonalizedLearningPlan(user.uid, sharedPayload.plan, sourceContext),
    saveLessonPackage(user.uid, {
      sourceName: sharedPayload.sourceLabel,
      sourceType: sourceContext,
      sourceText: sharedPayload.summary
    }, sharedPayload.lessonSuite || {}),
    saveDocumentAnalysis(user.uid, {
      fileName: sharedPayload.sourceLabel,
      fileType: sourceContext,
      fileSize: String(sharedPayload.summary || '').length
    }, sharedPayload.learningSession || {})
  ]);

  return sharedPayload;
}

export async function saveAssessmentRecord(user, assessmentPayload = {}) {
  if (!user?.uid) return null;

  const result = {
    topic: assessmentPayload.topic || 'adaptive-assessment',
    difficulty: assessmentPayload.difficulty || 'Medium',
    score: assessmentPayload.score || 0,
    total: assessmentPayload.total || 0,
    percentage: assessmentPayload.percentage || 0,
    questions: assessmentPayload.questions || []
  };

  await saveQuizRecord(user.uid, result.topic, result.difficulty, { title: `${result.topic} Assessment`, questions: result.questions }, result, '0:00');
  return result;
}
