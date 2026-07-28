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
  'Visual explanation driven by the uploaded material',
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

function getPrerequisiteChain(skill = '', profile = {}, sourceSummary = '') {
  const normalized = String(skill || '').toLowerCase();
  const sourceContext = String(sourceSummary || '').toLowerCase();
  const map = [
    {
      match: ['machine learning', 'ml', 'deep learning'],
      chain: ['Python workflow setup', 'Statistics for model evaluation', 'Feature engineering and validation', 'Model interpretation', 'Deployment and monitoring']
    },
    {
      match: ['python', 'django', 'flask'],
      chain: ['Code structure and modules', 'Data handling and APIs', 'Application architecture', 'Testing and deployment', 'Performance tuning']
    },
    {
      match: ['video editing', 'editing', 'premiere', 'davinci'],
      chain: ['Narrative pacing', 'Cutting and transitions', 'Audio and color refinement', 'Delivery formats', 'Portfolio packaging']
    },
    {
      match: ['trading', 'stocks', 'forex', 'crypto'],
      chain: ['Market structure', 'Risk management', 'Strategy journaling', 'Execution discipline', 'Portfolio review']
    },
    {
      match: ['medical', 'biology', 'anatomy'],
      chain: ['Anatomy landmarks', 'System relationships', 'Clinical reasoning', 'Case interpretation', 'Patient communication']
    },
    {
      match: ['react', 'frontend', 'web development'],
      chain: ['Component architecture', 'State and async flows', 'Performance and rendering', 'Testing and reliability', 'Launch-readiness review']
    }
  ];

  const match = map.find((item) => item.match.some((token) => normalized.includes(token)));
  if (match) return match.chain;

  if (sourceContext.includes('render') || sourceContext.includes('performance')) {
    return ['Working memory of the topic', 'Execution strategy', 'Optimization checkpoints', 'Evidence collection', 'Launch review'];
  }

  return [
    `${sanitizeText(profile?.currentLevel || 'Current level', 'Current level')} review`,
    `${sanitizeText(skill, 'Skill')} practice loop`,
    `${sanitizeText(profile?.learningStyle || 'Learning style', 'Learning style')} drill`,
    `${sanitizeText(profile?.endGoal || 'Career goal', 'Career goal')} application`,
    `${sanitizeText(profile?.preferredLanguage || 'Language', 'Language')} recap`
  ];
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

function createDailySchedule(profile, prereqChain, skill, sourceLabel) {
  const dailyMinutes = estimateDailyMinutes(profile?.dailyStudyTime);
  const styleLabel = sanitizeText(profile?.learningStyle, 'Hands-on');
  const languageLabel = sanitizeText(profile?.preferredLanguage, 'English');
  const locationLabel = sanitizeText(profile?.location, 'Your region');
  return prereqChain.slice(0, 7).map((topic, index) => ({
    day: `Day ${index + 1}`,
    topic,
    durationMinutes: dailyMinutes,
    tasks: [
      `Review ${topic} using ${styleLabel.toLowerCase()} methods and ${languageLabel.toLowerCase()} notes`,
      `Practice one task derived from ${sanitizeText(sourceLabel, skill)}`,
      `Capture one insight for ${locationLabel} job or internship relevance`
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
      deliverable: `Complete ${slice.join(' + ')} and publish evidence you can reuse in interviews, portfolio reviews, or client discussions.`
    });
  }
  return output;
}

function buildCareerLayer(skill, profile) {
  const role = sanitizeText(profile?.endGoal, 'career growth');
  const careerGoal = sanitizeText(profile?.careerGoal, role);
  const location = sanitizeText(profile?.location, 'your region');
  return {
    certifications: [`Target one credential that strengthens ${skill} for ${careerGoal}`, `Map a second credential to a visible hiring signal`],
    internshipPreparation: [`Resume aligned to ${skill} and ${careerGoal}`, 'Prepare a concise case study for internship interviews', 'Send tailored outreach messages with evidence from your work'],
    jobPreparation: ['Polish a compact portfolio narrative', 'Practice interview answers with real examples', 'Create a review loop for weak points'],
    freelancingRoadmap: ['Define a service niche around your strongest skills', 'Prepare one sample offer and one paid pilot', 'Collect testimonials and public proof'],
    startupBusinessOpportunities: [`Prototype a niche offer that uses ${skill}`, 'Sketch a monetization path and first customer segment', 'Run a lightweight validation sprint'],
    careerPaths: [`${skill} Specialist`, `${skill} Analyst`, `${skill} Consultant`, `${skill} Builder`],
    salaryInformation: `Pay ranges vary by ${location}, market demand, and experience. Treat salary estimates as informational only and not financial advice. Target role: ${role}.`
  };
}

function buildRecommendations(skill, profile, sourceContext, sourceLabel) {
  return [
    `Use the uploaded material from ${sanitizeText(sourceLabel, sourceContext)} as the anchor for every study session.`,
    `Align each sprint with your goal: ${sanitizeText(profile?.endGoal, 'Master Skill')}.`,
    `Use ${sanitizeText(profile?.preferredLanguage, 'English')} for notes, reviews, and recall drills.`,
    `Choose ${sanitizeText(profile?.learningStyle, 'hands-on')} exercises so the plan stays practical and memorable.`
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
  const prereqChain = getPrerequisiteChain(skill, interviewAnswers, sourceSummary);
  const levelFactor = estimateLevelFactor(interviewAnswers.currentLevel);
  const speedFactor = estimateSpeedFactor(interviewAnswers.learningSpeed, mode);
  const baseHours = Math.max(18, prereqChain.length * 16);
  const totalLearningHours = Math.round(baseHours * levelFactor * speedFactor);
  const dailyMinutes = estimateDailyMinutes(interviewAnswers.dailyStudyTime);
  const estimatedCompletionDays = Math.max(1, Math.ceil((totalLearningHours * 60) / Math.max(1, dailyMinutes)));

  const dailySchedule = createDailySchedule(interviewAnswers, prereqChain, skill, sourceLabel);
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

  const projects = [
    `Build a focused ${skill} artifact that solves one real task from the uploaded content`,
    `Create a reusable deliverable that can be shown in interviews or a portfolio`,
    `Document the outcome with before/after evidence, constraints, and improvement notes`
  ];
  const portfolio = [
    `Publish one polished case study around ${skill}`,
    `Add measurement, reflection, and implementation notes for recruiter clarity`,
    `Create a short narrative that ties the work to ${sanitizeText(interviewAnswers.careerGoal, sanitizeText(interviewAnswers.endGoal, 'your next role'))}`
  ];
  const career = [
    `Prepare a role-targeted narrative for ${sanitizeText(interviewAnswers.careerGoal, sanitizeText(interviewAnswers.endGoal, 'career growth'))}`,
    `Map one credible next step in local hiring, remote work, or freelance opportunities`,
    `Track relevant openings, communities, and learning proof points`
  ];
  const salaryDisclaimer = `salary estimates are informational only and can vary by location, industry demand, and experience. Use them as context, not financial advice.`;
  const internship = [
    `Tailor one resume summary for ${skill} and your target internship focus`,
    `Prepare a short story that explains how your work solves a practical problem`,
    `Create a concise outreach message for internships or mentorship opportunities`
  ];
  const freelancing = [
    `Identify one niche problem that ${skill} can solve clearly`,
    `Create an offer, sample output, and pricing framing`,
    `Pitch one pilot project and collect feedback quickly`
  ];
  const business = [
    `Frame a small offer or service around ${skill}`,
    `Define a simple client/value proposition and first milestone`,
    `Plan a lightweight launch experiment around your strongest proof point`
  ];

  const lessons = [
    createLesson(skill, 'Foundation', 0, prereqChain),
    createLesson(skill, 'Applied Practice', 1, prereqChain),
    createLesson(skill, 'Advanced Outcomes', 2, prereqChain)
  ];

  const careerLayer = buildCareerLayer(skill, interviewAnswers);
  const recommendations = buildRecommendations(skill, interviewAnswers, sourceContext, sourceLabel);
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
      projects,
      portfolio,
      career,
      salaryDisclaimer,
      salary: salaryDisclaimer,
      internship,
      freelancing,
      business,
      portfolioRoadmap: [
        'Define a portfolio theme that matches your career target',
        'Publish one evidence-backed artifact every week',
        'Turn each artifact into a concise case study with metrics',
        'Prepare a presentation-ready portfolio deck for interviews'
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
