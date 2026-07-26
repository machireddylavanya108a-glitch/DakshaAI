export function buildTutorLesson(topic = 'Learning Topic', mode = 'Teach Me') {
  const normalizedTopic = String(topic || 'Learning Topic').trim() || 'Learning Topic';
  const normalizedMode = String(mode || 'Teach Me').trim() || 'Teach Me';
  const mood = normalizedMode.toLowerCase().includes('expert') ? 'advanced' : normalizedMode.toLowerCase().includes('beginner') ? 'simple' : 'balanced';

  const explanation = mood === 'simple'
    ? `Start with the basic idea behind ${normalizedTopic} in very clear everyday language.`
    : mood === 'advanced'
      ? `Explain ${normalizedTopic} with depth, nuance, and linked concepts.`
      : `Teach ${normalizedTopic} with a structured explanation, examples, and practical guidance.`;

  return {
    topic: normalizedTopic,
    mode: normalizedMode,
    explanation,
    simpleExplanation: `Think of ${normalizedTopic} as a practical idea you can understand through observation and examples.`,
    deepExplanation: `A deeper view of ${normalizedTopic} shows how role, structure, practice, and feedback work together.`,
    examples: [`Example 1: ${normalizedTopic} in everyday life.`, `Example 2: ${normalizedTopic} in professional practice.`],
    applications: [`Use ${normalizedTopic} in real projects, case studies, and daily problem solving.`, `Connect it with similar topics to build long-term understanding.`],
    analogies: [`${normalizedTopic} is like a map that helps you navigate a complex subject.`, `It works like a toolbox that becomes more useful as you practice.`],
    stories: [`A learner starts with a small question, explores it step by step, and then sees the bigger picture.`, `A student who revises repeatedly builds confidence and clarity.`],
    steps: [`Understand the main idea.`, `Explore a practical example.`, `Practice with a guided task.`, `Review mistakes and revise.`],
    visuals: [`Flowchart for the main process.`, `Mind map showing core concepts.`, `Simple diagram connecting ideas.`],
    formulas: [`Main relation: concept -> understanding -> application.`, `Learning loop: observe -> practice -> review -> adapt.`],
    practiceQuestions: [`Explain ${normalizedTopic} in your own words.`, `Give one real-world example of ${normalizedTopic}.`],
    quiz: [
      { q: `What is the main idea behind ${normalizedTopic}?`, a: 'It is a concept that can be understood through explanation and practice.' },
      { q: `Why is ${normalizedTopic} important?`, a: 'It helps connect theory to practical use.' }
    ],
    flashcards: [
      { front: `What is ${normalizedTopic}?`, back: 'A concept that can be learned through explanation, examples, and practice.' },
      { front: `Why does it matter?`, back: 'It helps build understanding and real-world competence.' }
    ],
    roadmap: [`Week 1: Understand the basics.`, `Week 2: Practice with examples.`, `Week 3: Apply it in projects and revision.`],
    notes: [`Summary note: ${normalizedTopic} becomes easier when you connect it to examples.`],
    cheatSheet: [`Key idea`, `Main example`, `One practice task`, `One revision tip`],
    interviewQuestions: [`How would you explain ${normalizedTopic} simply?`, `What is one real-world use of ${normalizedTopic}?`],
    assignments: [`Create a short note on ${normalizedTopic}.`, `Solve one practice exercise related to ${normalizedTopic}.`],
    projects: [`Build a mini-project that applies ${normalizedTopic}.`],
    revision: [`Review the key idea.`, `Revisit the examples.`, `Test yourself using the quiz.`],
    weakAreas: [`Confusing the core idea with related terms.`, `Skipping practice and review.`],
    strongAreas: [`Good curiosity and willingness to learn.`],
    progress: 70,
    recommendedNext: `Continue with a small practice task on ${normalizedTopic}.`
  };
}

export function buildTutorDashboardData(history = []) {
  return {
    recentTopics: history.slice(0, 4).map((entry) => entry.topic),
    continueLearning: history.slice(0, 3).map((entry) => entry.lesson || entry.topic),
    recommendations: ['Practice one quiz question today', 'Revise the last lesson', 'Explore a related advanced topic'],
    weakConcepts: history.length ? ['Review earlier examples and notes'] : ['Start with a beginner lesson'],
    achievements: ['First lesson complete', 'Consistent practice streak'],
    learningTime: Math.max(10, history.length * 8),
    completedLessons: history.filter((entry) => entry.progress >= 70).length,
    incompleteLessons: Math.max(0, history.length - 1)
  };
}
