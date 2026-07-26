export function buildPracticeSet(topic = 'Practice Topic', difficulty = 'Beginner') {
  const normalizedTopic = String(topic || 'Practice Topic').trim() || 'Practice Topic';
  const normalizedDifficulty = String(difficulty || 'Beginner').trim() || 'Beginner';

  const baseQuestions = [
    {
      id: 1,
      type: 'MCQ',
      prompt: `What is the core idea behind ${normalizedTopic}?`,
      options: ['A practical concept', 'A random guess', 'A hidden rule', 'An empty idea'],
      answer: 'A practical concept',
      explanation: `The essential idea of ${normalizedTopic} is that it is a learnable concept that can be understood through practice and application.`,
      hint: 'Think about its main purpose.'
    },
    {
      id: 2,
      type: 'Short Answer',
      prompt: `Explain ${normalizedTopic} in one sentence.`,
      answer: `It is a meaningful topic that can be understood through examples, practice, and review.`,
      explanation: 'Short answers should be concise but accurate.',
      hint: 'Mention the purpose and an example.'
    },
    {
      id: 3,
      type: 'Coding Problem',
      prompt: `Write a small function that demonstrates ${normalizedTopic}.`,
      answer: 'function demo() { return "practice"; }',
      explanation: 'A simple function can represent the core behavior of the topic.',
      hint: 'Keep the solution minimal.'
    }
  ];

  const advancedQuestions = [
    {
      id: 4,
      type: 'Case Study',
      prompt: `A learner is trying to apply ${normalizedTopic} in a project. What should they do first?`,
      answer: 'Define the goal and break the task into smaller steps.',
      explanation: 'Structured practice improves learning quality.',
      hint: 'Start with planning.'
    },
    {
      id: 5,
      type: 'Numerical Problem',
      prompt: `If the learner solves 4 practice tasks in 20 minutes, what is their average time per task?`,
      answer: '5 minutes',
      explanation: '20 divided by 4 equals 5.',
      hint: 'Use division.'
    }
  ];

  const questions = normalizedDifficulty === 'Expert' || normalizedDifficulty === 'Advanced'
    ? [...baseQuestions, ...advancedQuestions]
    : baseQuestions;

  return {
    topic: normalizedTopic,
    difficulty: normalizedDifficulty,
    questions,
    summary: `Practice ${normalizedTopic} at ${normalizedDifficulty.toLowerCase()} difficulty.`,
    recommendations: ['Review the explanation after each answer', 'Try a harder variation next time', 'Keep a short note of weak areas']
  };
}

export function adaptDifficulty(accuracy, speed, history = []) {
  const previousCount = history.length || 0;
  if (accuracy >= 85 && speed <= 2) return 'Advanced';
  if (accuracy >= 70 && speed <= 3) return 'Intermediate';
  if (accuracy < 50 || previousCount > 3) return 'Beginner';
  return 'Intermediate';
}

export function buildAnalytics(results = []) {
  const total = results.length || 0;
  const averageScore = total ? Math.round(results.reduce((sum, item) => sum + item.score, 0) / total) : 0;
  const averageTime = total ? Math.round(results.reduce((sum, item) => sum + item.duration, 0) / total) : 0;
  return {
    accuracy: averageScore,
    averageTime,
    completion: total ? Math.round((results.filter((item) => item.completed).length / total) * 100) : 0,
    weakTopics: total ? ['Review explanations and revisit the weak areas'] : ['Start with a simple practice session'],
    strongTopics: total ? ['Consistent answer quality'] : ['Keep practicing to build confidence'],
    dailyProgress: total ? Math.min(100, averageScore + 10) : 0,
    weeklyProgress: total ? Math.min(100, averageScore + 15) : 0,
    monthlyProgress: total ? Math.min(100, averageScore + 20) : 0
  };
}
