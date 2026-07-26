import { db } from '../firebase/firebaseConfig';
import { doc, setDoc, collection, addDoc, query, where, getDocs, serverTimestamp, deleteDoc } from 'firebase/firestore';

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
