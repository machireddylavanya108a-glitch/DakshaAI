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
  const flashcards = Array.isArray(data.flashcards) ? data.flashcards : [];
  const memoryProfile = data.memoryProfile || {};

  const completedLessons = exerciseProgress.filter((entry) => Array.isArray(entry?.exercises) && entry.exercises.some((exercise) => exercise?.completed)).length;
  const learningProgress = calculateLearningProgress(exerciseProgress);
  const quizCount = quizScores.length;
  const accuracy = quizCount > 0
    ? Math.round(quizScores.reduce((total, item) => total + Number(item?.score || 0) / Math.max(Number(item?.total || 1), 1), 0) / quizCount * 100)
    : 0;
  const studyHours = Math.max(3, Math.round((completedLessons + quizCount + flashcards.length + documentAnalyses.length) * 0.8));
  const weeklyData = [
    { label: 'Mon', value: Math.max(20, studyHours - 5) },
    { label: 'Tue', value: Math.max(25, studyHours + 2) },
    { label: 'Wed', value: Math.max(18, studyHours - 1) },
    { label: 'Thu', value: Math.max(24, studyHours + 3) },
    { label: 'Fri', value: Math.max(22, studyHours + 1) },
    { label: 'Sat', value: Math.max(28, studyHours + 5) },
    { label: 'Sun', value: Math.max(30, studyHours + 6) }
  ];
  const monthlyData = [
    { label: 'W1', value: Math.max(35, studyHours + 8) },
    { label: 'W2', value: Math.max(40, studyHours + 10) },
    { label: 'W3', value: Math.max(38, studyHours + 9) },
    { label: 'W4', value: Math.max(46, studyHours + 12) }
  ];
  const quizData = [
    { label: 'Q1', value: Math.max(50, accuracy - 5) },
    { label: 'Q2', value: Math.max(58, accuracy + 3) },
    { label: 'Q3', value: Math.max(64, accuracy + 6) },
    { label: 'Q4', value: Math.max(72, accuracy + 8) }
  ];

  return {
    completedLessons,
    savedCourses: lessonSuites.length,
    quizScores: quizCount,
    learningProgress,
    studyHours,
    lessons: completedLessons + lessonSuites.length,
    quizzes: quizCount,
    accuracy,
    aiScore: Math.max(70, Math.round(learningProgress * 0.85 + accuracy * 0.15)),
    weeklyData,
    monthlyData,
    quizData,
    subjectDistribution: [
      { label: 'AI', value: 36 },
      { label: 'Math', value: 24 },
      { label: 'Science', value: 20 },
      { label: 'Writing', value: 20 }
    ],
    recentDocuments: documentAnalyses.slice(0, 4).map((entry) => ({
      fileName: entry?.fileName || 'Untitled document',
      fileType: entry?.fileType || 'document',
      createdAt: entry?.createdAt || null
    })),
    flashcardsReviewed: flashcards.length * 5,
    strongTopics: memoryProfile.strongConcepts || ['Logic', 'Problem solving'],
    weakTopics: memoryProfile.weakConcepts || ['Revision pacing', 'Recall speed'],
    recommendations: [
      'Next Lesson: Continue the newest academy roadmap.',
      'Weak Topic Revision: Revisit your weakest concept with a short quiz.',
      'New Skill: Explore a fresh topic and save a new lesson suite.',
      'Practice Quiz: Try a timed quiz to reinforce memory.',
      'Flashcards: Review your newest deck before the next session.',
      'Revision Notes: Capture one takeaway after each lesson.'
    ],
    achievements: [
      '7-Day Streak',
      'First Course',
      'Quiz Master',
      'Scanner Expert',
      'Flashcard Champion',
      'AI Explorer'
    ],
    recentActivity: [
      { title: 'Completed lesson', detail: 'Advanced your latest learning track.' },
      { title: 'Scanned document', detail: 'Turned notes into an AI-supported study path.' },
      { title: 'Reviewed flashcards', detail: 'Reinforced key concepts for retention.' }
    ],
    upcomingTasks: [
      'Continue learning track',
      'Upload a new PDF',
      'Finish a practice quiz',
      'Review flashcards'
    ],
    savedCourseNames: lessonSuites.slice(0, 3).map((item) => item?.topic || item?.skill || 'Saved Course')
  };
}
