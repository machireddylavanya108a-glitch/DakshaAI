import { db } from '../firebase/firebaseConfig';
import { doc, setDoc, collection, addDoc, query, where, getDocs, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { getCachedValue, setCachedValue } from '../utils/cache';

const FIRESTORE_CACHE_TTL = 1000 * 60 * 3;

async function readCachedCollection(collectionName, userId, loader, ttl = FIRESTORE_CACHE_TTL) {
  const cacheKey = `firestore:${collectionName}:${userId}`;
  const cached = getCachedValue(cacheKey, ttl);
  if (cached) return cached;
  const result = await loader();
  setCachedValue(cacheKey, result, ttl);
  return result;
}

export async function saveUserMemoryProfile(userId, profile) {
  try {
    const profileId = `${userId}_memory`;
    await setDoc(doc(db, 'userMemory', profileId), {
      userId,
      ...profile,
      updatedAt: serverTimestamp(),
      createdAt: profile?.createdAt || serverTimestamp(),
    });
    return true;
  } catch (error) {
    console.error('Error saving memory profile:', error);
    return false;
  }
}

export async function saveDashboardStats(userId, stats) {
  try {
    const statId = `${userId}_dashboard`;
    await setDoc(doc(db, 'dashboardStats', statId), {
      userId,
      studyHours: stats?.studyHours || 0,
      lessons: stats?.lessons || 0,
      quizzes: stats?.quizzes || 0,
      accuracy: stats?.accuracy || 0,
      streak: stats?.streak || 0,
      achievements: stats?.achievements || [],
      recommendations: stats?.recommendations || [],
      updatedAt: serverTimestamp(),
      createdAt: stats?.createdAt || serverTimestamp(),
    });
    return true;
  } catch (error) {
    console.error('Error saving dashboard stats:', error);
    return false;
  }
}

export async function getUserDashboardStats(userId) {
  try {
    return await readCachedCollection('dashboardStats', userId, async () => {
      const q = query(collection(db, 'dashboardStats'), where('userId', '==', userId));
      const querySnapshot = await getDocs(q);
      const stats = [];
      querySnapshot.forEach((docSnapshot) => stats.push({ id: docSnapshot.id, ...docSnapshot.data() }));
      return stats[0] || null;
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return null;
  }
}

export async function getUserMemoryProfile(userId) {
  try {
    return await readCachedCollection('userMemory', userId, async () => {
      const q = query(collection(db, 'userMemory'), where('userId', '==', userId));
      const querySnapshot = await getDocs(q);
      const profiles = [];
      querySnapshot.forEach((docSnapshot) => profiles.push({ id: docSnapshot.id, ...docSnapshot.data() }));
      return profiles[0] || null;
    });
  } catch (error) {
    console.error('Error fetching memory profile:', error);
    return null;
  }
}

export async function deleteUserMemoryProfile(userId) {
  try {
    const q = query(collection(db, 'userMemory'), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    const deletions = [];
    querySnapshot.forEach((docSnapshot) => deletions.push(deleteDoc(doc(db, 'userMemory', docSnapshot.id))));
    await Promise.all(deletions);
    return true;
  } catch (error) {
    console.error('Error deleting memory profile:', error);
    return false;
  }
}

export async function saveRoadmap(userId, skill, roadmapText) {
  try {
    await addDoc(collection(db, 'roadmaps'), {
      userId: userId,
      skill: skill,
      roadmap: roadmapText,
      createdAt: new Date()
    });
    return true;
  } catch (error) {
    console.error("Error saving roadmap:", error);
    return false;
  }
}

export async function saveSkillRoadmap(userId, skill, roadmapPayload) {
  try {
    const roadmapId = `${userId}_${skill.replace(/\s+/g, '_').toLowerCase()}`;
    await setDoc(doc(db, 'skillRoadmaps', roadmapId), {
      userId,
      skill,
      roadmap: roadmapPayload,
      createdAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error('Error saving skill roadmap:', error);
    return false;
  }
}

export async function getUserSkillRoadmaps(userId) {
  try {
    return await readCachedCollection('skillRoadmaps', userId, async () => {
      const q = query(collection(db, 'skillRoadmaps'), where('userId', '==', userId));
      const querySnapshot = await getDocs(q);
      const roadmaps = [];
      querySnapshot.forEach((docSnapshot) => {
        roadmaps.push({ id: docSnapshot.id, ...docSnapshot.data() });
      });
      return roadmaps.sort((a, b) => {
        const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return bTime - aTime;
      });
    });
  } catch (error) {
    console.error('Error fetching skill roadmaps:', error);
    return [];
  }
}

export async function deleteSkillRoadmap(userId, roadmapId) {
  try {
    await deleteDoc(doc(db, 'skillRoadmaps', roadmapId));
    return true;
  } catch (error) {
    console.error('Error deleting skill roadmap:', error);
    return false;
  }
}

export async function saveDocumentAnalysis(userId, fileMeta, analysis) {
  try {
    await addDoc(collection(db, 'documentAnalyses'), {
      userId,
      fileName: fileMeta.fileName,
      fileType: fileMeta.fileType,
      fileSize: fileMeta.fileSize,
      analysis,
      createdAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error('Error saving document analysis:', error);
    return false;
  }
}

export async function saveLessonPackage(userId, sourceMeta, lessonPackage) {
  try {
    await addDoc(collection(db, 'lessonPackages'), {
      userId,
      sourceName: sourceMeta.sourceName,
      sourceType: sourceMeta.sourceType,
      sourceText: sourceMeta.sourceText?.substring(0, 2000) || '',
      lessonPackage,
      createdAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error('Error saving lesson package:', error);
    return false;
  }
}

export async function getUserRoadmaps(userId) {
  try {
    const q = query(collection(db, 'roadmaps'), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    const roadmaps = [];
    querySnapshot.forEach((doc) => {
      roadmaps.push({ id: doc.id, ...doc.data() });
    });
    return roadmaps.sort((a, b) => {
      const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return bTime - aTime;
    });
  } catch (error) {
    console.error("Error fetching roadmaps:", error);
    return [];
  }
}

export async function saveLessonSuite(userId, topic, suiteData) {
  try {
    const suiteId = `${userId}_${topic.replace(/\s+/g, '_').toLowerCase()}`;
    await setDoc(doc(db, 'lessonSuites', suiteId), {
      userId,
      topic,
      roadmap: Array.isArray(suiteData?.roadmap) ? suiteData.roadmap : [],
      suite: suiteData,
      createdAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error('Error saving lesson suite:', error);
    return false;
  }
}

export async function getUserLessonSuites(userId) {
  try {
    return await readCachedCollection('lessonSuites', userId, async () => {
      const q = query(collection(db, 'lessonSuites'), where('userId', '==', userId));
      const querySnapshot = await getDocs(q);
      const suites = [];
      querySnapshot.forEach((doc) => {
        suites.push({ id: doc.id, ...doc.data() });
      });

      return suites.sort((a, b) => {
        const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return bTime - aTime;
      });
    });
  } catch (error) {
    console.error('Error fetching lesson suites:', error);
    return [];
  }
}

export async function saveQuizRecord(userId, topic, difficulty, quiz, result, timeTaken) {
  try {
    const recordId = `${userId}_${Date.now()}`;
    await setDoc(doc(db, 'quizzes', recordId), {
      userId,
      topic,
      difficulty,
      questions: quiz?.questions || [],
      score: result?.score || 0,
      percentage: result?.percentage || 0,
      correctAnswers: result?.correctAnswers || 0,
      wrongAnswers: result?.wrongAnswers || 0,
      grade: result?.grade || 'F',
      timeTaken,
      createdAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error('Error saving quiz record:', error);
    return false;
  }
}

export async function getUserQuizRecords(userId) {
  try {
    const q = query(collection(db, 'quizzes'), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    const records = [];
    querySnapshot.forEach((docSnapshot) => {
      records.push({ id: docSnapshot.id, ...docSnapshot.data() });
    });
    return records.sort((a, b) => {
      const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return bTime - aTime;
    });
  } catch (error) {
    console.error('Error fetching quiz records:', error);
    return [];
  }
}

export async function deleteQuizRecord(userId, quizId) {
  try {
    await deleteDoc(doc(db, 'quizzes', quizId));
    return true;
  } catch (error) {
    console.error('Error deleting quiz record:', error);
    return false;
  }
}

export async function saveQuizScore(userId, topic, score, total) {
  try {
    await addDoc(collection(db, 'quizScores'), {
      userId,
      topic,
      score,
      total,
      createdAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error('Error saving quiz score:', error);
    return false;
  }
}

export async function saveIntegrationRecord(userId, collectionName, payload) {
  try {
    const recordId = `${userId}_${Date.now()}`;
    await setDoc(doc(db, collectionName, recordId), {
      userId,
      ...payload,
      createdAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error(`Error saving ${collectionName}:`, error);
    return false;
  }
}

export async function getIntegrationRecords(userId, collectionName) {
  try {
    const q = query(collection(db, collectionName), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    const records = [];
    querySnapshot.forEach((docSnapshot) => records.push({ id: docSnapshot.id, ...docSnapshot.data() }));
    return records;
  } catch (error) {
    console.error(`Error fetching ${collectionName}:`, error);
    return [];
  }
}

export async function saveLearningSessionProgress(userId, sessionPayload) {
  try {
    const sessionId = sessionPayload?.sessionId || `${userId}_${Date.now()}`;
    await setDoc(doc(db, 'learningSessions', sessionId), {
      userId,
      sessionId,
      sourceContext: sessionPayload?.sourceContext || 'general',
      sourceLabel: sessionPayload?.sourceLabel || '',
      status: sessionPayload?.status || 'in_progress',
      currentStep: Number.isFinite(sessionPayload?.currentStep) ? sessionPayload.currentStep : 0,
      answers: sessionPayload?.answers || {},
      updatedAtMs: sessionPayload?.updatedAtMs || Date.now(),
      createdAt: sessionPayload?.createdAt || serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true });
    return true;
  } catch (error) {
    console.error('Error saving learning session progress:', error);
    return false;
  }
}

export async function getLatestLearningSession(userId, sourceContext = 'general') {
  try {
    const q = query(collection(db, 'learningSessions'), where('userId', '==', userId), where('sourceContext', '==', sourceContext));
    const querySnapshot = await getDocs(q);
    const sessions = [];
    querySnapshot.forEach((docSnapshot) => sessions.push({ id: docSnapshot.id, ...docSnapshot.data() }));
    sessions.sort((a, b) => (b.updatedAtMs || 0) - (a.updatedAtMs || 0));
    return sessions[0] || null;
  } catch (error) {
    console.error('Error fetching latest learning session:', error);
    return null;
  }
}

export async function completeLearningInterview(userId, interviewPayload) {
  try {
    const sessionId = interviewPayload?.session?.sessionId || `${userId}_${Date.now()}`;
    const profileId = `${userId}_${sessionId}`;

    await Promise.all([
      setDoc(doc(db, 'learningProfiles', profileId), {
        ...interviewPayload?.profile,
        userId,
        sessionId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true }),
      setDoc(doc(db, 'learningGoals', profileId), {
        ...interviewPayload?.goal,
        userId,
        sessionId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true }),
      setDoc(doc(db, 'learningPreferences', profileId), {
        ...interviewPayload?.preference,
        userId,
        sessionId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true }),
      setDoc(doc(db, 'learningSessions', sessionId), {
        ...interviewPayload?.session,
        userId,
        sessionId,
        status: 'completed',
        updatedAtMs: Date.now(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true })
    ]);

    return true;
  } catch (error) {
    console.error('Error completing learning interview:', error);
    return false;
  }
}

function toSafeId(value = '') {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export async function savePersonalizedLearningPlan(userId, learningPlan, source = 'academy') {
  try {
    const topic = learningPlan?.topic || 'general-learning';
    const planId = learningPlan?.id || `${userId}_${toSafeId(topic)}_${Date.now()}`;
    const base = {
      userId,
      planId,
      topic,
      source,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    await Promise.all([
      setDoc(doc(db, 'learningPlans', planId), {
        ...base,
        topic,
        profile: learningPlan?.profile || {},
        analytics: learningPlan?.analytics || {},
        plan: learningPlan?.plan || {},
        estimatedCompletion: learningPlan?.estimatedCompletion || {},
        inputSource: learningPlan?.inputSource || {},
        adaptiveLearning: learningPlan?.adaptiveLearning || {},
        knowledgeDependency: learningPlan?.knowledgeDependency || {},
        lessonEngine: learningPlan?.lessonEngine || {},
        progress: learningPlan?.progress || {},
        statistics: learningPlan?.statistics || {}
      }, { merge: true }),
      setDoc(doc(db, 'learningRoadmaps', planId), {
        ...base,
        roadmap: learningPlan?.knowledgeDependency?.chain || [],
        recommendations: learningPlan?.plan?.aiRecommendations || [],
        portfolioRoadmap: learningPlan?.plan?.portfolioRoadmap || [],
        futureTrends: learningPlan?.plan?.futureTrends || []
      }, { merge: true }),
      setDoc(doc(db, 'learningProgress', planId), {
        ...base,
        progress: learningPlan?.progress || {}
      }, { merge: true }),
      setDoc(doc(db, 'learningStatistics', planId), {
        ...base,
        statistics: learningPlan?.statistics || {}
      }, { merge: true }),
      setDoc(doc(db, 'dailyPlans', planId), {
        ...base,
        dailySchedule: learningPlan?.plan?.dailySchedule || []
      }, { merge: true }),
      setDoc(doc(db, 'weeklyPlans', planId), {
        ...base,
        weeklyMilestones: learningPlan?.plan?.weeklyMilestones || []
      }, { merge: true }),
      setDoc(doc(db, 'monthlyPlans', planId), {
        ...base,
        monthlyMilestones: learningPlan?.plan?.monthlyMilestones || []
      }, { merge: true }),
      setDoc(doc(db, 'careerGoals', planId), {
        ...base,
        certifications: learningPlan?.plan?.certifications || [],
        internshipPreparation: learningPlan?.plan?.internshipPreparation || [],
        jobPreparation: learningPlan?.plan?.jobPreparation || [],
        freelancingRoadmap: learningPlan?.plan?.freelancingRoadmap || [],
        startupBusinessOpportunities: learningPlan?.plan?.startupBusinessOpportunities || [],
        careerPaths: learningPlan?.plan?.careerPaths || [],
        salaryInformation: learningPlan?.plan?.salaryInformation || ''
      }, { merge: true })
    ]);

    return { ok: true, planId };
  } catch (error) {
    console.error('Error saving personalized learning plan:', error);
    return { ok: false, planId: null };
  }
}

export async function getUserPersonalizedLearningPlans(userId) {
  try {
    return await readCachedCollection('learningPlans', userId, async () => {
      const q = query(collection(db, 'learningPlans'), where('userId', '==', userId));
      const querySnapshot = await getDocs(q);
      const plans = [];
      querySnapshot.forEach((docSnapshot) => {
        plans.push({ id: docSnapshot.id, ...docSnapshot.data() });
      });

      return plans.sort((a, b) => {
        const aTime = a.updatedAt?.toMillis ? a.updatedAt.toMillis() : 0;
        const bTime = b.updatedAt?.toMillis ? b.updatedAt.toMillis() : 0;
        return bTime - aTime;
      });
    });
  } catch (error) {
    console.error('Error fetching personalized learning plans:', error);
    return [];
  }
}

export async function deletePersonalizedLearningPlan(userId, planId) {
  try {
    await Promise.all([
      deleteDoc(doc(db, 'learningPlans', planId)),
      deleteDoc(doc(db, 'learningRoadmaps', planId)),
      deleteDoc(doc(db, 'learningProgress', planId)),
      deleteDoc(doc(db, 'learningStatistics', planId)),
      deleteDoc(doc(db, 'dailyPlans', planId)),
      deleteDoc(doc(db, 'weeklyPlans', planId)),
      deleteDoc(doc(db, 'monthlyPlans', planId)),
      deleteDoc(doc(db, 'careerGoals', planId))
    ]);
    return true;
  } catch (error) {
    console.error('Error deleting personalized learning plan:', error);
    return false;
  }
}

export async function saveLessonSession(userId, payload) {
  try {
    const sessionId = payload?.sessionId || `${userId}_${Date.now()}`;
    await setDoc(doc(db, 'lessonSessions', sessionId), {
      userId,
      sessionId,
      topic: payload?.topic || 'General Lesson',
      teachingMode: payload?.teachingMode || {},
      chapterIndex: Number.isFinite(payload?.chapterIndex) ? payload.chapterIndex : 0,
      stepIndex: Number.isFinite(payload?.stepIndex) ? payload.stepIndex : 0,
      paused: Boolean(payload?.paused),
      weakTopics: Array.isArray(payload?.weakTopics) ? payload.weakTopics : [],
      bookmarks: Array.isArray(payload?.bookmarks) ? payload.bookmarks : [],
      progressPercent: Number.isFinite(payload?.progressPercent) ? payload.progressPercent : 0,
      updatedAtMs: Date.now(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true });

    return { ok: true, sessionId };
  } catch (error) {
    console.error('Error saving lesson session:', error);
    return { ok: false, sessionId: null };
  }
}

export async function saveLessonHistory(userId, payload) {
  try {
    await addDoc(collection(db, 'lessonHistory'), {
      userId,
      topic: payload?.topic || 'General Lesson',
      summary: payload?.summary || '',
      progressPercent: Number.isFinite(payload?.progressPercent) ? payload.progressPercent : 0,
      weakTopics: Array.isArray(payload?.weakTopics) ? payload.weakTopics : [],
      createdAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error('Error saving lesson history:', error);
    return false;
  }
}

export async function saveConversationHistory(userId, sessionId, messages = []) {
  try {
    await setDoc(doc(db, 'conversationHistory', sessionId), {
      userId,
      sessionId,
      messages,
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp()
    }, { merge: true });
    return true;
  } catch (error) {
    console.error('Error saving conversation history:', error);
    return false;
  }
}

export async function saveLessonBookmark(userId, payload) {
  try {
    const bookmarkId = payload?.bookmarkId || `${userId}_${Date.now()}`;
    await setDoc(doc(db, 'lessonBookmarks', bookmarkId), {
      userId,
      topic: payload?.topic || 'General Lesson',
      chapterIndex: Number.isFinite(payload?.chapterIndex) ? payload.chapterIndex : 0,
      note: payload?.note || '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true });
    return true;
  } catch (error) {
    console.error('Error saving lesson bookmark:', error);
    return false;
  }
}

export async function saveLessonProgress(userId, payload) {
  try {
    const progressId = payload?.progressId || `${userId}_${toSafeId(payload?.topic || 'general')}`;
    await setDoc(doc(db, 'lessonProgress', progressId), {
      userId,
      progressId,
      topic: payload?.topic || 'General Lesson',
      chapterIndex: Number.isFinite(payload?.chapterIndex) ? payload.chapterIndex : 0,
      stepIndex: Number.isFinite(payload?.stepIndex) ? payload.stepIndex : 0,
      progressPercent: Number.isFinite(payload?.progressPercent) ? payload.progressPercent : 0,
      weakTopics: Array.isArray(payload?.weakTopics) ? payload.weakTopics : [],
      updatedAtMs: Date.now(),
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp()
    }, { merge: true });
    return true;
  } catch (error) {
    console.error('Error saving lesson progress:', error);
    return false;
  }
}

export async function saveVoicePreference(userId, preference) {
  try {
    const preferenceId = `${userId}_voice`;
    await setDoc(doc(db, 'voicePreferences', preferenceId), {
      userId,
      voiceType: preference?.voiceType || 'natural',
      speed: preference?.speed || 'normal',
      captions: Boolean(preference?.captions),
      subtitles: Boolean(preference?.subtitles),
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp()
    }, { merge: true });
    return true;
  } catch (error) {
    console.error('Error saving voice preference:', error);
    return false;
  }
}

export async function getLatestLessonSession(userId) {
  try {
    const q = query(collection(db, 'lessonSessions'), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    const sessions = [];
    snapshot.forEach((docSnapshot) => sessions.push({ id: docSnapshot.id, ...docSnapshot.data() }));
    sessions.sort((a, b) => (b.updatedAtMs || 0) - (a.updatedAtMs || 0));
    return sessions[0] || null;
  } catch (error) {
    console.error('Error fetching latest lesson session:', error);
    return null;
  }
}

export async function saveCameraLearningRecord(userId, payload) {
  try {
    const recordId = payload?.id || `${userId}_${Date.now()}`;
    await setDoc(doc(db, 'cameraLearning', recordId), {
      userId,
      imageName: payload?.imageName || 'camera-image',
      ocrText: payload?.ocrText || '',
      analysis: payload?.analysis || {},
      lesson: payload?.lesson || {},
      summary: payload?.summary || '',
      quiz: payload?.quiz || [],
      flashcards: payload?.flashcards || [],
      createdAt: payload?.createdAt ? new Date(payload.createdAt) : serverTimestamp(),
    });
    return true;
  } catch (error) {
    console.error('Error saving camera learning record:', error);
    return false;
  }
}

export async function getUserCameraLearning(userId) {
  try {
    const q = query(collection(db, 'cameraLearning'), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    const records = [];
    querySnapshot.forEach((docSnapshot) => {
      records.push({ id: docSnapshot.id, ...docSnapshot.data() });
    });
    return records.sort((a, b) => {
      const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return bTime - aTime;
    });
  } catch (error) {
    console.error('Error fetching camera learning records:', error);
    return [];
  }
}

export async function deleteCameraLearningRecord(userId, recordId) {
  try {
    await deleteDoc(doc(db, 'cameraLearning', recordId));
    return true;
  } catch (error) {
    console.error('Error deleting camera learning record:', error);
    return false;
  }
}

export async function renameCameraLearningRecord(userId, recordId, newName) {
  try {
    await setDoc(doc(db, 'cameraLearning', recordId), { imageName: newName }, { merge: true });
    return true;
  } catch (error) {
    console.error('Error renaming camera learning record:', error);
    return false;
  }
}

export async function saveVoiceLesson(userId, payload) {
  try {
    const lessonId = `${userId}_${Date.now()}`;
    await setDoc(doc(db, 'voiceLessons', lessonId), {
      userId,
      topic: payload?.topic || 'Voice lesson',
      conversation: payload?.conversation || [],
      language: payload?.language || 'English',
      teacherMode: payload?.teacherMode || 'friendly',
      createdAt: payload?.createdAt ? new Date(payload.createdAt) : serverTimestamp(),
    });
    return true;
  } catch (error) {
    console.error('Error saving voice lesson:', error);
    return false;
  }
}

export async function getUserVoiceLessons(userId) {
  try {
    const q = query(collection(db, 'voiceLessons'), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    const records = [];
    querySnapshot.forEach((docSnapshot) => {
      records.push({ id: docSnapshot.id, ...docSnapshot.data() });
    });
    return records.sort((a, b) => {
      const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return bTime - aTime;
    });
  } catch (error) {
    console.error('Error fetching voice lessons:', error);
    return [];
  }
}

export async function deleteVoiceLesson(userId, lessonId) {
  try {
    await deleteDoc(doc(db, 'voiceLessons', lessonId));
    return true;
  } catch (error) {
    console.error('Error deleting voice lesson:', error);
    return false;
  }
}

export async function renameVoiceLesson(userId, lessonId, newName) {
  try {
    await setDoc(doc(db, 'voiceLessons', lessonId), { topic: newName }, { merge: true });
    return true;
  } catch (error) {
    console.error('Error renaming voice lesson:', error);
    return false;
  }
}

export async function bookmarkVoiceLesson(userId, payload) {
  try {
    const bookmarkId = `${userId}_${Date.now()}`;
    await setDoc(doc(db, 'voiceBookmarks', bookmarkId), {
      userId,
      ...payload,
      createdAt: serverTimestamp(),
    });
    return true;
  } catch (error) {
    console.error('Error saving voice bookmark:', error);
    return false;
  }
}

export async function saveCameraBookmark(userId, bookmark) {
  try {
    const bookmarkId = `${userId}_${Date.now()}`;
    await setDoc(doc(db, 'cameraBookmarks', bookmarkId), {
      userId,
      ...bookmark,
      createdAt: serverTimestamp(),
    });
    return true;
  } catch (error) {
    console.error('Error saving camera bookmark:', error);
    return false;
  }
}

export async function savePdfLearningRecord(userId, fileName, analysis, lesson, summary, quiz = [], flashcards = []) {
  try {
    const recordId = `${userId}_${Date.now()}`;
    await setDoc(doc(db, 'pdfLearning', recordId), {
      userId,
      fileName,
      analysis,
      lesson,
      summary,
      quiz,
      flashcards,
      createdAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error('Error saving PDF learning record:', error);
    return false;
  }
}

export async function getUserPdfLearning(userId) {
  try {
    const q = query(collection(db, 'pdfLearning'), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    const records = [];
    querySnapshot.forEach((docSnapshot) => {
      records.push({ id: docSnapshot.id, ...docSnapshot.data() });
    });
    return records.sort((a, b) => {
      const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return bTime - aTime;
    });
  } catch (error) {
    console.error('Error fetching PDF learning records:', error);
    return [];
  }
}

export async function deletePdfLearningRecord(userId, recordId) {
  try {
    await deleteDoc(doc(db, 'pdfLearning', recordId));
    return true;
  } catch (error) {
    console.error('Error deleting PDF learning record:', error);
    return false;
  }
}

export async function savePptLearningRecord(userId, payload) {
  try {
    const recordId = payload?.id || `${userId}_${Date.now()}`;
    await setDoc(doc(db, 'pptLearning', recordId), {
      userId,
      fileName: payload?.fileName || 'presentation.pptx',
      slides: payload?.slides || [],
      analysis: payload?.analysis || {},
      lesson: payload?.lesson || {},
      summary: payload?.summary || '',
      quiz: payload?.quiz || [],
      flashcards: payload?.flashcards || [],
      createdAt: payload?.createdAt ? new Date(payload.createdAt) : serverTimestamp(),
    });
    return true;
  } catch (error) {
    console.error('Error saving PPT learning record:', error);
    return false;
  }
}

export async function getUserPptLearning(userId) {
  try {
    const q = query(collection(db, 'pptLearning'), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    const records = [];
    querySnapshot.forEach((docSnapshot) => {
      records.push({ id: docSnapshot.id, ...docSnapshot.data() });
    });
    return records.sort((a, b) => {
      const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return bTime - aTime;
    });
  } catch (error) {
    console.error('Error fetching PPT learning records:', error);
    return [];
  }
}

export async function deletePptLearningRecord(userId, recordId) {
  try {
    await deleteDoc(doc(db, 'pptLearning', recordId));
    return true;
  } catch (error) {
    console.error('Error deleting PPT learning record:', error);
    return false;
  }
}

export async function renamePptLearningRecord(userId, recordId, newName) {
  try {
    const recordRef = doc(db, 'pptLearning', recordId);
    await setDoc(recordRef, { fileName: newName }, { merge: true });
    return true;
  } catch (error) {
    console.error('Error renaming PPT learning record:', error);
    return false;
  }
}

export async function saveYouTubeLearningRecord(userId, payload) {
  try {
    const recordId = payload?.id || `${userId}_${Date.now()}`;
    await setDoc(doc(db, 'youtubeLearning', recordId), {
      userId,
      videoUrl: payload?.videoUrl || '',
      videoTitle: payload?.videoTitle || 'YouTube lesson',
      transcript: payload?.transcript || [],
      analysis: payload?.analysis || {},
      lesson: payload?.lesson || {},
      summary: payload?.summary || '',
      quiz: payload?.quiz || [],
      flashcards: payload?.flashcards || [],
      createdAt: payload?.createdAt ? new Date(payload.createdAt) : serverTimestamp(),
    });
    return true;
  } catch (error) {
    console.error('Error saving YouTube learning record:', error);
    return false;
  }
}

export async function getUserYouTubeLearning(userId) {
  try {
    const q = query(collection(db, 'youtubeLearning'), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    const records = [];
    querySnapshot.forEach((docSnapshot) => {
      records.push({ id: docSnapshot.id, ...docSnapshot.data() });
    });
    return records.sort((a, b) => {
      const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return bTime - aTime;
    });
  } catch (error) {
    console.error('Error fetching YouTube learning records:', error);
    return [];
  }
}

export async function deleteYouTubeLearningRecord(userId, recordId) {
  try {
    await deleteDoc(doc(db, 'youtubeLearning', recordId));
    return true;
  } catch (error) {
    console.error('Error deleting YouTube learning record:', error);
    return false;
  }
}

export async function renameYouTubeLearningRecord(userId, recordId, newName) {
  try {
    await setDoc(doc(db, 'youtubeLearning', recordId), { videoTitle: newName }, { merge: true });
    return true;
  } catch (error) {
    console.error('Error renaming YouTube learning record:', error);
    return false;
  }
}

export async function saveYouTubeBookmark(userId, bookmark) {
  try {
    const bookmarkId = `${userId}_${Date.now()}`;
    await setDoc(doc(db, 'youtubeBookmarks', bookmarkId), {
      userId,
      ...bookmark,
      createdAt: serverTimestamp(),
    });
    return true;
  } catch (error) {
    console.error('Error saving YouTube bookmark:', error);
    return false;
  }
}

export async function saveWebsiteLearningRecord(userId, payload) {
  try {
    const recordId = payload?.id || `${userId}_${Date.now()}`;
    await setDoc(doc(db, 'websiteLearning', recordId), {
      userId,
      url: payload?.url || '',
      title: payload?.title || 'Website lesson',
      content: payload?.content || '',
      analysis: payload?.analysis || {},
      lesson: payload?.lesson || {},
      summary: payload?.summary || '',
      quiz: payload?.quiz || [],
      flashcards: payload?.flashcards || [],
      createdAt: payload?.createdAt ? new Date(payload.createdAt) : serverTimestamp(),
    });
    return true;
  } catch (error) {
    console.error('Error saving website learning record:', error);
    return false;
  }
}

export async function getUserWebsiteLearning(userId) {
  try {
    const q = query(collection(db, 'websiteLearning'), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    const records = [];
    querySnapshot.forEach((docSnapshot) => {
      records.push({ id: docSnapshot.id, ...docSnapshot.data() });
    });
    return records.sort((a, b) => {
      const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return bTime - aTime;
    });
  } catch (error) {
    console.error('Error fetching website learning records:', error);
    return [];
  }
}

export async function deleteWebsiteLearningRecord(userId, recordId) {
  try {
    await deleteDoc(doc(db, 'websiteLearning', recordId));
    return true;
  } catch (error) {
    console.error('Error deleting website learning record:', error);
    return false;
  }
}

export async function renameWebsiteLearningRecord(userId, recordId, newName) {
  try {
    await setDoc(doc(db, 'websiteLearning', recordId), { title: newName }, { merge: true });
    return true;
  } catch (error) {
    console.error('Error renaming website learning record:', error);
    return false;
  }
}

export async function saveWebsiteBookmark(userId, bookmark) {
  try {
    const bookmarkId = `${userId}_${Date.now()}`;
    await setDoc(doc(db, 'websiteBookmarks', bookmarkId), {
      userId,
      ...bookmark,
      createdAt: serverTimestamp(),
    });
    return true;
  } catch (error) {
    console.error('Error saving website bookmark:', error);
    return false;
  }
}

export async function saveDocxLearningRecord(userId, payload) {
  try {
    const recordId = payload?.id || `${userId}_${Date.now()}`;
    await setDoc(doc(db, 'docxLearning', recordId), {
      userId,
      fileName: payload?.fileName || 'document.docx',
      createdAt: payload?.createdAt ? new Date(payload.createdAt) : serverTimestamp(),
      package: payload?.package || {},
      previewText: payload?.previewText || '',
    });
    return true;
  } catch (error) {
    console.error('Error saving DOCX learning record:', error);
    return false;
  }
}

export async function getUserDocxLearning(userId) {
  try {
    const q = query(collection(db, 'docxLearning'), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    const records = [];
    querySnapshot.forEach((docSnapshot) => {
      records.push({ id: docSnapshot.id, ...docSnapshot.data() });
    });
    return records.sort((a, b) => {
      const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return bTime - aTime;
    });
  } catch (error) {
    console.error('Error fetching DOCX learning records:', error);
    return [];
  }
}

export async function deleteDocxLearningRecord(userId, recordId) {
  try {
    await deleteDoc(doc(db, 'docxLearning', recordId));
    return true;
  } catch (error) {
    console.error('Error deleting DOCX learning record:', error);
    return false;
  }
}

export async function saveFlashcardDeck(userId, topic, difficulty, deck) {
  try {
    const deckId = `${userId}_${Date.now()}`;
    await setDoc(doc(db, 'flashcards', deckId), {
      userId,
      topic,
      difficulty,
      deck,
      progress: { cardsLearned: 0, cardsRemaining: deck?.flashcards?.length || 0 },
      createdAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error('Error saving flashcard deck:', error);
    return false;
  }
}

export async function getUserFlashcards(userId) {
  try {
    const q = query(collection(db, 'flashcards'), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    const decks = [];
    querySnapshot.forEach((docSnapshot) => {
      decks.push({ id: docSnapshot.id, ...docSnapshot.data() });
    });
    return decks.sort((a, b) => {
      const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return bTime - aTime;
    });
  } catch (error) {
    console.error('Error fetching flashcard decks:', error);
    return [];
  }
}

export async function deleteFlashcardDeck(userId, deckId) {
  try {
    await deleteDoc(doc(db, 'flashcards', deckId));
    return true;
  } catch (error) {
    console.error('Error deleting flashcard deck:', error);
    return false;
  }
}

export async function saveFlashcards(userId, topic, flashcards) {
  try {
    await addDoc(collection(db, 'flashcards'), {
      userId,
      topic,
      flashcards,
      createdAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error('Error saving flashcards:', error);
    return false;
  }
}

export async function savePracticalExercises(userId, topic, exercises) {
  try {
    const progressId = `${userId}_${topic.replace(/\s+/g, '_').toLowerCase()}`;
    await setDoc(doc(db, 'exerciseProgress', progressId), {
      userId,
      topic,
      exercises,
      updatedAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error('Error saving practical exercises:', error);
    return false;
  }
}

export async function saveInterviewHistory(userId, topic, category, question, answer) {
  try {
    await addDoc(collection(db, 'interviewHistory'), {
      userId,
      topic,
      category,
      question,
      answer,
      createdAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error('Error saving interview history:', error);
    return false;
  }
}

export async function getUserInterviewHistory(userId) {
  try {
    const q = query(collection(db, 'interviewHistory'), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    const history = [];
    querySnapshot.forEach((docSnapshot) => {
      history.push({ id: docSnapshot.id, ...docSnapshot.data() });
    });
    return history.sort((a, b) => {
      const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return bTime - aTime;
    });
  } catch (error) {
    console.error('Error fetching interview history:', error);
    return [];
  }
}

export async function getUserExerciseProgress(userId) {
  try {
    const q = query(collection(db, 'exerciseProgress'), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    const progress = [];
    querySnapshot.forEach((docSnapshot) => {
      progress.push({ id: docSnapshot.id, ...docSnapshot.data() });
    });
    return progress.sort((a, b) => {
      const aTime = a.updatedAt?.toMillis ? a.updatedAt.toMillis() : 0;
      const bTime = b.updatedAt?.toMillis ? b.updatedAt.toMillis() : 0;
      return bTime - aTime;
    });
  } catch (error) {
    console.error('Error fetching exercise progress:', error);
    return [];
  }
}

export async function getUserDocumentAnalyses(userId) {
  try {
    const q = query(collection(db, 'documentAnalyses'), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    const analyses = [];
    querySnapshot.forEach((docSnapshot) => {
      analyses.push({ id: docSnapshot.id, ...docSnapshot.data() });
    });
    return analyses.sort((a, b) => {
      const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return bTime - aTime;
    });
  } catch (error) {
    console.error('Error fetching document analyses:', error);
    return [];
  }
}

export async function getUserQuizScores(userId) {
  try {
    const q = query(collection(db, 'quizScores'), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    const scores = [];
    querySnapshot.forEach((docSnapshot) => {
      scores.push({ id: docSnapshot.id, ...docSnapshot.data() });
    });
    return scores.sort((a, b) => {
      const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return bTime - aTime;
    });
  } catch (error) {
    console.error('Error fetching quiz scores:', error);
    return [];
  }
}

export async function saveAutomaticSceneBundle(userId, payload) {
  try {
    const sceneId = payload?.sceneId || `${userId}_${Date.now()}`;
    const topic = payload?.scene?.title || 'Automatic Scene';

    await Promise.all([
      setDoc(doc(db, 'sceneLibrary', sceneId), {
        userId,
        sceneId,
        topic,
        subject: payload?.plan?.subject || 'general',
        sourceType: payload?.sourceType || 'typed-topic',
        reusableAssets: payload?.scene?.reusableAssets || [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true }),
      setDoc(doc(db, 'sceneTemplates', sceneId), {
        userId,
        sceneId,
        template: {
          objects: payload?.scene?.objects || [],
          timeline: payload?.scene?.timeline || [],
          cameraCues: payload?.scene?.cameraCues || []
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true }),
      setDoc(doc(db, 'lessonScenes', sceneId), {
        userId,
        sceneId,
        lessonContent: payload?.lessonContent?.slice(0, 6000) || '',
        scene: payload?.scene || {},
        plan: payload?.plan || {},
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true }),
      setDoc(doc(db, 'userScenes', sceneId), {
        userId,
        sceneId,
        topic,
        status: 'ready',
        sourceType: payload?.sourceType || 'typed-topic',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true }),
      setDoc(doc(db, 'sceneCache', sceneId), {
        userId,
        sceneId,
        scene: payload?.scene || {},
        plan: payload?.plan || {},
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true })
    ]);

    return { ok: true, sceneId };
  } catch (error) {
    console.error('Error saving automatic scene bundle:', error);
    return { ok: false, sceneId: null };
  }
}

export async function getUserScenes(userId) {
  try {
    return await readCachedCollection('userScenes', userId, async () => {
      const q = query(collection(db, 'userScenes'), where('userId', '==', userId));
      const querySnapshot = await getDocs(q);
      const scenes = [];
      querySnapshot.forEach((docSnapshot) => scenes.push({ id: docSnapshot.id, ...docSnapshot.data() }));
      return scenes.sort((a, b) => {
        const aTime = a.updatedAt?.toMillis ? a.updatedAt.toMillis() : 0;
        const bTime = b.updatedAt?.toMillis ? b.updatedAt.toMillis() : 0;
        return bTime - aTime;
      });
    });
  } catch (error) {
    console.error('Error fetching user scenes:', error);
    return [];
  }
}

export async function saveSceneTimeline(userId, sceneId, timeline = []) {
  try {
    const timelineId = `${userId}_${sceneId}`;
    await setDoc(doc(db, 'sceneTimelines', timelineId), {
      userId,
      sceneId,
      timeline,
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp()
    }, { merge: true });
    return true;
  } catch (error) {
    console.error('Error saving scene timeline:', error);
    return false;
  }
}

export async function saveLessonAnimations(userId, sceneId, animations = []) {
  try {
    const animationId = `${userId}_${sceneId}`;
    await setDoc(doc(db, 'lessonAnimations', animationId), {
      userId,
      sceneId,
      animations,
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp()
    }, { merge: true });
    return true;
  } catch (error) {
    console.error('Error saving lesson animations:', error);
    return false;
  }
}

export async function saveCameraPreset(userId, sceneId, preset = {}) {
  try {
    const presetId = `${userId}_${sceneId}`;
    await setDoc(doc(db, 'cameraPresets', presetId), {
      userId,
      sceneId,
      preset,
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp()
    }, { merge: true });
    return true;
  } catch (error) {
    console.error('Error saving camera preset:', error);
    return false;
  }
}

export async function saveEnvironmentPreset(userId, sceneId, preset = {}) {
  try {
    const presetId = `${userId}_${sceneId}`;
    await setDoc(doc(db, 'environmentPresets', presetId), {
      userId,
      sceneId,
      preset,
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp()
    }, { merge: true });
    return true;
  } catch (error) {
    console.error('Error saving environment preset:', error);
    return false;
  }
}

export async function saveUserBookmark(userId, bookmark = {}) {
  try {
    const sceneId = bookmark?.sceneId || 'scene';
    const bookmarkId = `${userId}_${sceneId}_${bookmark?.stepIndex || 0}_${Date.now()}`;
    await setDoc(doc(db, 'userBookmarks', bookmarkId), {
      userId,
      ...bookmark,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true });
    return true;
  } catch (error) {
    console.error('Error saving user bookmark:', error);
    return false;
  }
}

export async function saveSceneHistory(userId, entry = {}) {
  try {
    const historyId = `${userId}_${entry?.sceneId || 'scene'}_${Date.now()}`;
    await setDoc(doc(db, 'sceneHistory', historyId), {
      userId,
      ...entry,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true });
    return true;
  } catch (error) {
    console.error('Error saving scene history:', error);
    return false;
  }
}

export async function getUserSceneBookmarks(userId) {
  try {
    return await readCachedCollection('userBookmarks', userId, async () => {
      const q = query(collection(db, 'userBookmarks'), where('userId', '==', userId));
      const querySnapshot = await getDocs(q);
      const bookmarks = [];
      querySnapshot.forEach((docSnapshot) => bookmarks.push({ id: docSnapshot.id, ...docSnapshot.data() }));
      return bookmarks.sort((a, b) => {
        const aTime = a.updatedAt?.toMillis ? a.updatedAt.toMillis() : 0;
        const bTime = b.updatedAt?.toMillis ? b.updatedAt.toMillis() : 0;
        return bTime - aTime;
      });
    });
  } catch (error) {
    console.error('Error fetching scene bookmarks:', error);
    return [];
  }
}

export async function getUserSceneHistory(userId) {
  try {
    return await readCachedCollection('sceneHistory', userId, async () => {
      const q = query(collection(db, 'sceneHistory'), where('userId', '==', userId));
      const querySnapshot = await getDocs(q);
      const entries = [];
      querySnapshot.forEach((docSnapshot) => entries.push({ id: docSnapshot.id, ...docSnapshot.data() }));
      return entries.sort((a, b) => {
        const aTime = a.updatedAt?.toMillis ? a.updatedAt.toMillis() : 0;
        const bTime = b.updatedAt?.toMillis ? b.updatedAt.toMillis() : 0;
        return bTime - aTime;
      });
    });
  } catch (error) {
    console.error('Error fetching scene history:', error);
    return [];
  }
}
