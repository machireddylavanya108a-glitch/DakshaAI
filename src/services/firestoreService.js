import { db } from '../firebase/firebaseConfig';
import { collection, addDoc, query, where, getDocs, orderBy } from 'firebase/firestore';

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
