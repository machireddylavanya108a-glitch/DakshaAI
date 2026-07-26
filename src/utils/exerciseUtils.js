export function normalizePracticalExercises(exercises = [], topic = '') {
  const safeExercises = Array.isArray(exercises) ? exercises.filter(Boolean) : [];

  return safeExercises.slice(0, 8).map((exercise, index) => ({
    id: exercise.id || `${topic}-${index}`,
    title: exercise.title || `Practice ${index + 1}`,
    description: exercise.description || 'Work through a focused task to strengthen your understanding.',
    difficulty: ['Easy', 'Medium', 'Hard'].includes(exercise.difficulty) ? exercise.difficulty : 'Easy',
    steps: Array.isArray(exercise.steps) && exercise.steps.length > 0 ? exercise.steps : ['Review the core concept and write one takeaway'],
    completed: Boolean(exercise.completed)
  }));
}

export function calculateCompletionPercentage(exercises = []) {
  if (!Array.isArray(exercises) || exercises.length === 0) return 0;
  const completed = exercises.filter((item) => item?.completed).length;
  return Math.round((completed / exercises.length) * 100);
}
