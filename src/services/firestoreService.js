import { db } from '../firebase/firebaseConfig';
import { doc, setDoc, collection, addDoc, query, where, getDocs, orderBy, serverTimestamp } from 'firebase/firestore';

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
      userId: userId,
      topic: topic,
      suite: suiteData,
      createdAt: new Date()
    });
    return true;
  } catch (error) {
    console.error("Error saving lesson suite:", error);
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
    return suites;
  } catch (error) {
    console.error("Error fetching lesson suites:", error);
    return [];
  }
}

export async function saveLessonSuite(userId, topic, suiteData) {
  try {
    const suiteId = `${userId}_${topic.replace(/\s+/g, '_').toLowerCase()}`;
    await setDoc(doc(db, 'lessonSuites', suiteId), {
      userId: userId,
      topic: topic,
      suite: suiteData,
      createdAt: new Date()
    });
    return true;
  } catch (error) {
    console.error("Error saving lesson suite:", error);
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
    return suites;
  } catch (error) {
    console.error("Error fetching lesson suites:", error);
    return [];
  }
}
