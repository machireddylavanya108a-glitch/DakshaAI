const MODE_OPTIONS = [
  'Fast Track',
  'Standard',
  'Deep Learning',
  'Exam Mode',
  'Interview Mode',
  'Project Mode',
  'Business Mode',
  'Research Mode'
];

const DEFAULT_LESSON_TEMPLATE = [
  'Learning Objectives',
  'Real-world Applications',
  'Why this topic matters',
  'Interactive explanation',
  'Visual explanation placeholder',
  'Practice',
  'Quiz',
  'Assignment',
  'Common mistakes',
  'AI Summary',
  'Next lesson preview'
];

function sanitizeText(value, fallback = '') {
  const output = String(value || '').trim();
  return output || fallback;
}

function estimateDailyMinutes(studyTime = '1 hour') {
  const normalized = String(studyTime || '').toLowerCase();
  if (normalized.includes('15')) return 15;
  if (normalized.includes('30')) return 30;
  if (normalized.includes('2 hour')) return 120;
  if (normalized.includes('4 hour')) return 240;
  if (normalized.includes('flexible')) return 75;
  return 60;
}

function estimateLevelFactor(level = 'Beginner') {
  const normalized = String(level || '').toLowerCase();
  if (normalized.includes('complete beginner')) return 1.35;
  if (normalized.includes('beginner')) return 1.15;
  if (normalized.includes('intermediate')) return 1;
  if (normalized.includes('advanced')) return 0.8;
  if (normalized.includes('expert')) return 0.65;
  return 1;
}

function estimateSpeedFactor(speed = 'Normal', mode = 'Standard') {
  const normalized = `${speed} ${mode}`.toLowerCase();
  if (normalized.includes('fast')) return 0.75;
  if (normalized.includes('deep')) return 1.35;
  if (normalized.includes('research')) return 1.4;
  if (normalized.includes('exam')) return 0.9;
  return 1;
}

function inferLearningMode(profile) {
  const reason = String(profile?.reason || '').toLowerCase();
  const endGoal = String(profile?.endGoal || '').toLowerCase();
  const speed = String(profile?.learningSpeed || '').toLowerCase();

  if (reason.includes('research') || endGoal.includes('research')) return 'Research Mode';
  if (reason.includes('business') || endGoal.includes('startup') || endGoal.includes('business')) return 'Business Mode';
  if (reason.includes('exam') || endGoal.includes('exam') || endGoal.includes('certification')) return 'Exam Mode';
  if (endGoal.includes('job')) return 'Interview Mode';
  if (reason.includes('freelancing') || endGoal.includes('freelancing')) return 'Project Mode';
  if (speed.includes('fast')) return 'Fast Track';
  if (speed.includes('detailed')) return 'Deep Learning';
  return 'Standard';
}

function getPrerequisiteChain(skill = '') {
  const normalized = String(skill || '').toLowerCase();
  const map = [
    {
      match: ['machine learning', 'ml', 'deep learning'],
      chain: ['Python Fundamentals', 'Statistics', 'Linear Algebra', 'Data Analysis', 'Machine Learning Core']
    },
    {
      match: ['python', 'django', 'flask'],
      chain: ['Computer Basics', 'Programming Logic', 'Python Syntax', 'Data Structures', 'Real Projects']
    },
    {
      match: ['video editing', 'editing', 'premiere', 'davinci'],
      chain: ['Storytelling Basics', 'Editing Interface', 'Cutting & Transitions', 'Color & Audio', 'Portfolio Projects']
    },
    {
      match: ['trading', 'stocks', 'forex', 'crypto'],
      chain: ['Market Basics', 'Risk Management', 'Technical Analysis', 'Trading Psychology', 'Strategy Building']
    },
    {
      match: ['medical', 'biology', 'anatomy'],
      chain: ['Biology Foundations', 'Human Systems', 'Clinical Concepts', 'Case Interpretation', 'Applied Practice']
    },
    {
      match: ['react', 'frontend', 'web development'],
      chain: ['HTML/CSS', 'JavaScript Basics', 'React Fundamentals', 'State Management', 'Production Deployment']
    }
  ];

  const match = map.find((item) => item.match.some((token) => normalized.includes(token)));
  if (match) return match.chain;

  return ['Foundations', 'Core Concepts', 'Guided Practice', 'Applied Projects', sanitizeText(skill, 'Mastery')];
}

function createDifficultyTasks(topic, stage) {
  return {
    easy: `Explain ${topic} at ${stage} level in plain words with one example.`,
    medium: `Solve a structured practice set for ${topic} in ${stage}.`,
    hard: `Complete a scenario-based challenge for ${topic} (${stage}).`,
    expert: `Design and defend an expert-grade solution around ${topic} (${stage}).`
  };
}

function createLesson(topic, stage, index, prereqChain) {
  const next = prereqChain[index + 1] || `${topic} advanced application`;
  return {
    lessonId: `${stage.toLowerCase().replace(/\s+/g, '-')}-${index + 1}`,
    title: `${stage}: ${topic}`,
    stage,
    template: DEFAULT_LESSON_TEMPLATE,
    learningObjectives: [`Understand ${topic} in ${stage}`, `Apply ${topic} with confidence`, `Build output for ${topic}`],
    realWorldApplications: [`Use ${topic} in production workflows`, `Connect ${topic} to real problems`],
    whyItMatters: `${topic} helps accelerate your path to ${stage.toLowerCase()} outcomes.`,
    interactiveExplanation: `Interactive guided explanation for ${topic} (${stage}).`,
    visualPlaceholder: `Visual placeholder: ${topic} diagram, flow, and example map.`,
    practice: [`Practice set A for ${topic}`, `Practice set B for ${topic}`],
    quiz: [`Quiz 1 for ${topic}`, `Quiz 2 for ${topic}`],
    assignment: `Build an assignment around ${topic} in ${stage}.`,
    commonMistakes: [`Skipping fundamentals in ${topic}`, `Practicing without review`, `Ignoring feedback loops`],
    aiSummary: `AI summary for ${topic} at ${stage} level.`,
    nextLessonPreview: `Next: ${next}`,
    difficulties: createDifficultyTasks(topic, stage)
  };
}

function createDailySchedule(profile, prereqChain) {
  const dailyMinutes = estimateDailyMinutes(profile?.dailyStudyTime);
  return prereqChain.slice(0, 7).map((topic, index) => ({
    day: `Day ${index + 1}`,
    topic,
    durationMinutes: dailyMinutes,
    tasks: [
      `Read and understand ${topic}`,
      `Practice one exercise on ${topic}`,
      `Write a short recap for ${topic}`
    ]
  }));
}

function createMilestones(prereqChain, unit = 'weekly') {
  const chunkSize = unit === 'monthly' ? 2 : 1;
  const output = [];
  for (let i = 0; i < prereqChain.length; i += chunkSize) {
    const slice = prereqChain.slice(i, i + chunkSize);
    output.push({
      title: `${unit === 'weekly' ? 'Week' : 'Month'} ${output.length + 1}`,
      focus: slice,
      deliverable: `Complete ${slice.join(' + ')} and publish learning proof.`
    });
  }
  return output;
}

function buildCareerLayer(skill, profile) {
  const role = sanitizeText(profile?.endGoal, 'career growth');
  return {
    certifications: [`Top certification path for ${skill}`, `Intermediate certificate for ${skill}`],
    internshipPreparation: [`Resume aligned to ${skill}`, 'Mock projects for internship interviews', 'Internship outreach script'],
    jobPreparation: ['Portfolio polish', 'Interview question bank', 'Mock interviews and feedback loop'],
    freelancingRoadmap: ['Define service niche', 'Create offer stack', 'Pilot client workflow and testimonials'],
    startupBusinessOpportunities: [`Startup concept using ${skill}`, 'Monetization model sketch', 'Go-to-market first sprint'],
    careerPaths: [`${skill} Specialist`, `${skill} Analyst`, `${skill} Consultant`, `${skill} Builder`],
    salaryInformation: `Estimated salary varies by location, market cycle, and experience level. Treat all estimates as informational only, not financial advice. Target role: ${role}.`
  };
}

function buildRecommendations(skill, profile, sourceContext) {
  return [
    `Prioritize ${skill} fundamentals for the first sprint.`,
    `Align practice with your goal: ${sanitizeText(profile?.endGoal, 'Master Skill')}.`,
    `Use ${sanitizeText(profile?.preferredLanguage, 'English')} for faster retention and reviews.`,
    `Source-aware strategy enabled for ${sanitizeText(sourceContext, 'typed topic')} input.`
  ];
}

function buildProgressSeed(totalHours, dailyMinutes, dailySchedule) {
  const days = Math.max(1, Math.ceil((totalHours * 60) / Math.max(1, dailyMinutes)));
  const estimateDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  return {
    completionPercent: 0,
    dailyStreak: 0,
    timeStudiedMinutes: 0,
    skillsMastered: [],
    weakConcepts: [],
    strongConcepts: [],
    achievementBadges: ['Interview Completed', 'Plan Initialized'],
    estimatedCompletionDate: estimateDate.toISOString(),
    upcomingLessons: dailySchedule.slice(0, 3).map((item) => item.topic)
  };
}

export function buildPersonalizedLearningPlan({
  interviewAnswers = {},
  sourceContext = 'typed-topic',
  sourceLabel = '',
  sourceSummary = '',
  skillHint = ''
} = {}) {
  const skill = sanitizeText(interviewAnswers.learnTopic, sanitizeText(skillHint, 'General Learning'));
  const mode = inferLearningMode(interviewAnswers);
  const prereqChain = getPrerequisiteChain(skill);
  const levelFactor = estimateLevelFactor(interviewAnswers.currentLevel);
  const speedFactor = estimateSpeedFactor(interviewAnswers.learningSpeed, mode);
  const baseHours = Math.max(18, prereqChain.length * 16);
  const totalLearningHours = Math.round(baseHours * levelFactor * speedFactor);
  const dailyMinutes = estimateDailyMinutes(interviewAnswers.dailyStudyTime);
  const estimatedCompletionDays = Math.max(1, Math.ceil((totalLearningHours * 60) / Math.max(1, dailyMinutes)));

  const dailySchedule = createDailySchedule(interviewAnswers, prereqChain);
  const weeklyMilestones = createMilestones(prereqChain, 'weekly');
  const monthlyMilestones = createMilestones(prereqChain, 'monthly');

  const tools = {
    requiredTools: ['Structured note-taking system', 'Practice tracker', 'Weekly review checklist'],
    software: ['Daksha AI Workspace', 'Calendar/Task planner', 'Knowledge capture app'],
    hardware: ['Laptop or tablet', 'Headset for voice lessons', 'Stable internet connection'],
    prerequisites: prereqChain,
    safetyInstructions: sourceContext.includes('camera') || sourceContext.includes('image')
      ? ['Verify OCR output before execution.', 'Do not run unknown commands/code from scanned content.']
      : ['Validate facts from critical sources.', 'Take breaks to avoid fatigue and burnout.']
  };

  const practiceSchedule = [
    { cadence: 'Daily', task: `20-40 minutes of guided practice for ${skill}` },
    { cadence: 'Weekly', task: 'One synthesis task + one review quiz' },
    { cadence: 'Monthly', task: 'One capstone checkpoint and reflection report' }
  ];

  const miniProjects = prereqChain.slice(0, 3).map((item, index) => `${index + 1}. Mini project for ${item}`);
  const majorProjects = [
    `Build a production-quality ${skill} portfolio project`,
    `Create a measurable outcome project aligned to ${sanitizeText(interviewAnswers.endGoal, 'Master Skill')}`
  ];

  const lessons = [
    createLesson(skill, 'Foundation', 0, prereqChain),
    createLesson(skill, 'Applied Practice', 1, prereqChain),
    createLesson(skill, 'Advanced Outcomes', 2, prereqChain)
  ];

  const careerLayer = buildCareerLayer(skill, interviewAnswers);
  const recommendations = buildRecommendations(skill, interviewAnswers, sourceContext);
  const progress = buildProgressSeed(totalLearningHours, dailyMinutes, dailySchedule);

  return {
    id: `plan_${Date.now()}`,
    topic: skill,
    inputSource: {
      sourceContext,
      sourceLabel,
      sourceSummary
    },
    profile: {
      ...interviewAnswers,
      activeMode: mode,
      supportedModes: MODE_OPTIONS
    },
    analytics: {
      userGoal: sanitizeText(interviewAnswers.reason, 'Personal Interest'),
      skill,
      subject: skill,
      difficulty: sanitizeText(interviewAnswers.currentLevel, 'Beginner'),
      currentKnowledge: sanitizeText(interviewAnswers.existingKnowledge, 'Not specified'),
      availableStudyTime: sanitizeText(interviewAnswers.dailyStudyTime, '1 hour'),
      preferredLanguage: sanitizeText(interviewAnswers.preferredLanguage, 'English'),
      learningStyle: sanitizeText(interviewAnswers.learningStyle, 'Combination'),
      learningSpeed: sanitizeText(interviewAnswers.learningSpeed, 'Normal'),
      endGoal: sanitizeText(interviewAnswers.endGoal, 'Master Skill')
    },
    estimatedCompletion: {
      estimatedCompletionTime: `${estimatedCompletionDays} days`,
      totalLearningHours,
      estimatedCompletionDays
    },
    plan: {
      dailySchedule,
      weeklyMilestones,
      monthlyMilestones,
      ...tools,
      practiceSchedule,
      miniProjects,
      majorProjects,
      portfolioRoadmap: [
        'Define portfolio theme and evidence strategy',
        'Publish mini project outcomes weekly',
        'Publish major project case study with metrics',
        'Prepare presentation-ready portfolio deck'
      ],
      ...careerLayer,
      futureTrends: [`AI-assisted workflows in ${skill}`, `Global remote opportunities in ${skill}`, 'High-trust portfolio-first hiring'],
      aiRecommendations: recommendations
    },
    adaptiveLearning: {
      strategy: String(interviewAnswers.currentLevel || '').toLowerCase().includes('beginner')
        ? 'Explain everything from zero.'
        : String(interviewAnswers.currentLevel || '').toLowerCase().includes('intermediate')
          ? 'Skip basics and accelerate practical depth.'
          : 'Focus on optimization, scale, and advanced outcomes.'
    },
    knowledgeDependency: {
      chain: prereqChain,
      explanation: 'Prerequisite chain automatically generated to decide what should be learned first.'
    },
    lessonEngine: {
      difficulties: ['Easy', 'Medium', 'Hard', 'Expert'],
      lessons
    },
    progress,
    statistics: {
      totalLearningHours,
      dailyMinutesTarget: dailyMinutes,
      streakTarget: 30,
      reviewCadence: 'weekly',
      performanceBaseline: 'initialized'
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}
