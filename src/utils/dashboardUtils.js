export function calculateLearningProgress(exerciseProgress = []) {
  if (!Array.isArray(exerciseProgress) || exerciseProgress.length === 0) return 0;

  const completedCount = exerciseProgress.reduce((total, entry) => {
    const exercises = Array.isArray(entry?.exercises) ? entry.exercises : [];
    return total + exercises.filter((exercise) => exercise?.completed).length;
  }, 0);

  const totalCount = exerciseProgress.reduce((total, entry) => {
    const exercises = Array.isArray(entry?.exercises) ? entry.exercises : [];
    return total + exercises.length;
  }, 0);

  if (totalCount === 0) return 0;
  return Math.round((completedCount / totalCount) * 100);
}

export function summarizeDashboardStats(data = {}) {
  const lessonSuites = Array.isArray(data.lessonSuites) ? data.lessonSuites : [];
  const exerciseProgress = Array.isArray(data.exerciseProgress) ? data.exerciseProgress : [];
  const quizScores = Array.isArray(data.quizScores) ? data.quizScores : [];
  const documentAnalyses = Array.isArray(data.documentAnalyses) ? data.documentAnalyses : [];

  return {
    completedLessons: exerciseProgress.filter((entry) => Array.isArray(entry?.exercises) && entry.exercises.some((exercise) => exercise?.completed)).length,
    savedCourses: lessonSuites.length,
    quizScores: quizScores.length,
    learningProgress: calculateLearningProgress(exerciseProgress),
    recentDocuments: documentAnalyses.slice(0, 4).map((entry) => ({
      fileName: entry?.fileName || 'Untitled document',
      fileType: entry?.fileType || 'document',
      createdAt: entry?.createdAt || null
    }))
  };
}
