function normalizeLessonTopic(value = '') {
  return String(value || '').trim() || 'Learning Topic';
}

function getLessonTemplates(topic = '') {
  const normalizedTopic = normalizeLessonTopic(topic).toLowerCase();

  if (normalizedTopic.includes('trading') || normalizedTopic.includes('stock') || normalizedTopic.includes('crypto')) {
    return [
      { title: 'Market Basics', lessonPath: ['Market Basics', 'Candlestick Analysis', 'Price Action', 'Support Resistance', 'Risk Management', 'Trading Psychology', 'Backtesting', 'Live Trading'] },
      { title: 'Candlestick Analysis', lessonPath: ['Candlestick Analysis', 'Chart Patterns', 'Volume', 'Entry Signals', 'Exit Signals', 'Risk Rules'] },
      { title: 'Risk Management', lessonPath: ['Risk Management', 'Position Sizing', 'Stop Loss', 'Risk Reward', 'Trade Journal'] }
    ];
  }

  if (normalizedTopic.includes('python')) {
    return [
      { title: 'Variables', lessonPath: ['Variables', 'Loops', 'Functions', 'Classes', 'Files', 'Modules', 'Projects'] },
      { title: 'Loops', lessonPath: ['Loops', 'Conditionals', 'Lists', 'Comprehensions', 'Practice Problems'] },
      { title: 'Functions', lessonPath: ['Functions', 'Arguments', 'Return Values', 'Scope', 'Small Projects'] }
    ];
  }

  return [
    { title: `Foundations of ${topic}`, lessonPath: [`${topic} Basics`, `${topic} Core Ideas`, `${topic} Practice`, `${topic} Application`] },
    { title: `${topic} in Practice`, lessonPath: [`${topic} Examples`, `${topic} Workflow`, `${topic} Challenges`, `${topic} Reflection`] },
    { title: `${topic} Mastery`, lessonPath: [`${topic} Review`, `${topic} Revision`, `${topic} Assessment`, `${topic} Next Steps`] }
  ];
}

export function buildDynamicLessonPlan(topic = 'Learning Topic', options = {}) {
  const normalizedTopic = normalizeLessonTopic(topic);
  const difficulty = String(options.difficulty || 'Beginner').trim() || 'Beginner';
  const lessonCount = Math.max(3, Number(options.lessonCount || 3));
  const templates = getLessonTemplates(normalizedTopic);

  return Array.from({ length: lessonCount }, (_, index) => {
    const template = templates[index % templates.length];
    const title = template.title;
    const lessonPath = template.lessonPath.slice(0, 4 + index);
    return {
      title,
      topic: normalizedTopic,
      difficulty,
      objectives: [
        `Understand the core idea behind ${title}`,
        `Apply ${title} in a simple real-world scenario`,
        `Explain ${title} clearly in your own words`
      ],
      visuals: [
        `Diagram for ${title}`,
        `Flowchart showing the key steps of ${title}`,
        `Example board demonstrating ${title}`
      ],
      examples: [
        `${title} example 1: a practical walkthrough`,
        `${title} example 2: a common real-world case`
      ],
      quiz: [
        { question: `What is the main idea behind ${title}?`, options: ['A simple definition', 'A random fact', 'A unrelated concept', 'A summary note'], answer: 'A simple definition' },
        { question: `How would you apply ${title}?`, options: ['With a step-by-step example', 'By ignoring context', 'By skipping practice', 'By memorizing without understanding'], answer: 'With a step-by-step example' }
      ],
      practice: [
        `Practice task: work through a short exercise for ${title}`,
        `Practice task: compare two examples related to ${title}`
      ],
      assignment: `Create a short note or mini-project showing how you used ${title} in practice.`,
      summary: `Summary: ${title} is best learned by combining understanding, examples, practice, and revision.`,
      revision: [
        `Review the key points of ${title}`,
        `Re-do one practice example from ${title}`,
        `Explain ${title} out loud without notes`
      ],
      timeEstimate: `${Math.max(10, 20 + index * 8)} min`,
      lessonPath
    };
  });
}

export function buildTutorLesson(topic = 'Learning Topic', mode = 'Teach Me') {
  const normalizedTopic = normalizeLessonTopic(topic);
  const normalizedMode = String(mode || 'Teach Me').trim() || 'Teach Me';
  const mood = normalizedMode.toLowerCase().includes('expert') ? 'advanced' : normalizedMode.toLowerCase().includes('beginner') ? 'simple' : 'balanced';
  const plan = buildDynamicLessonPlan(normalizedTopic, { lessonCount: 3, difficulty: mood === 'advanced' ? 'Advanced' : mood === 'simple' ? 'Beginner' : 'Intermediate' });
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
    examples: plan.flatMap((lesson) => lesson.examples),
    applications: [`Use ${normalizedTopic} in real projects, case studies, and daily problem solving.`, `Connect it with similar topics to build long-term understanding.`],
    analogies: [`${normalizedTopic} is like a map that helps you navigate a complex subject.`, `It works like a toolbox that becomes more useful as you practice.`],
    stories: [`A learner starts with a small question, explores it step by step, and then sees the bigger picture.`, `A student who revises repeatedly builds confidence and clarity.`],
    steps: [`Understand the main idea.`, `Explore a practical example.`, `Practice with a guided task.`, `Review mistakes and revise.`],
    visuals: plan.flatMap((lesson) => lesson.visuals),
    formulas: [`Main relation: concept -> understanding -> application.`, `Learning loop: observe -> practice -> review -> adapt.`],
    practiceQuestions: plan.flatMap((lesson) => lesson.practice),
    quiz: plan.flatMap((lesson) => lesson.quiz),
    flashcards: plan.slice(0, 3).map((lesson) => ({ front: lesson.title, back: lesson.summary })),
    roadmap: plan.map((lesson) => `${lesson.title} (${lesson.timeEstimate})`),
    notes: plan.map((lesson) => lesson.summary),
    cheatSheet: plan.slice(0, 3).flatMap((lesson) => [lesson.title, lesson.summary]),
    interviewQuestions: [`How would you explain ${normalizedTopic} simply?`, `What is one real-world use of ${normalizedTopic}?`],
    assignments: plan.map((lesson) => lesson.assignment),
    projects: [`Build a mini-project that applies ${normalizedTopic}.`],
    revision: plan.flatMap((lesson) => lesson.revision),
    weakAreas: [`Confusing the core idea with related terms.`, `Skipping practice and review.`],
    strongAreas: [`Good curiosity and willingness to learn.`],
    progress: 70,
    recommendedNext: `Continue with a practical task on ${normalizedTopic}.`,
    lessons: plan
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
