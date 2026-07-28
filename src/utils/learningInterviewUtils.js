export const LEARNING_REASON_OPTIONS = [
  'Job',
  'Freelancing',
  'Business',
  'College',
  'School',
  'Exam',
  'Research',
  'Personal Interest',
  'Other'
];

export const CURRENT_LEVEL_OPTIONS = [
  'Complete Beginner',
  'Beginner',
  'Intermediate',
  'Advanced',
  'Expert'
];

export const DAILY_STUDY_TIME_OPTIONS = [
  '15 min',
  '30 min',
  '1 hour',
  '2 hours',
  '4 hours',
  'Flexible'
];

export const LEARNING_STYLE_OPTIONS = [
  'Videos',
  '3D',
  'Reading',
  'Practice',
  'Voice',
  'Combination'
];

export const LEARNING_SPEED_OPTIONS = [
  'Fast Track',
  'Normal',
  'Detailed'
];

export const END_GOAL_OPTIONS = [
  'Get Job',
  'Freelancing',
  'Business',
  'Startup',
  'Exam',
  'College',
  'Certification',
  'Research',
  'Master Skill'
];

export function getSkillFollowUpQuestion(topic = '') {
  const normalized = String(topic || '').toLowerCase();

  const map = [
    {
      match: ['python', 'javascript', 'java', 'coding', 'programming', 'developer', 'react'],
      question: 'Have you ever written code before? Which languages or projects have you tried?'
    },
    {
      match: ['video editing', 'editing', 'premiere', 'after effects', 'davinci', 'final cut'],
      question: 'Which editing software have you used so far, if any?'
    },
    {
      match: ['trading', 'stock', 'forex', 'crypto', 'investing'],
      question: 'Have you traded before? If yes, what market and for how long?'
    },
    {
      match: ['medical', 'biology', 'anatomy', 'doctor', 'nursing', 'pharmacology'],
      question: 'Do you already have biology or medical fundamentals?'
    },
    {
      match: ['design', 'ui', 'ux', 'graphic'],
      question: 'What tools have you used before (for example Figma, Photoshop, Illustrator)?'
    }
  ];

  const matched = map.find((item) => item.match.some((token) => normalized.includes(token)));
  return matched?.question || 'What prior knowledge or practical experience do you already have in this topic?';
}

function buildBaseLearningInterviewQuestions(topic = '') {
  return [
    {
      id: 'learnTopic',
      prompt: 'What do you want to learn?',
      type: 'text',
      placeholder: topic || 'Example: Video Editing, Python, Trading, Biology',
      required: true
    },
    {
      id: 'reason',
      prompt: 'Why do you want to learn it?',
      type: 'chips',
      options: LEARNING_REASON_OPTIONS,
      required: true
    },
    {
      id: 'currentLevel',
      prompt: 'What is your current level?',
      type: 'chips',
      options: CURRENT_LEVEL_OPTIONS,
      required: true
    },
    {
      id: 'preferredLanguage',
      prompt: 'Preferred language? You can mix languages (for example: English + Telugu).',
      type: 'text',
      placeholder: 'English + Hindi',
      required: true
    },
    {
      id: 'age',
      prompt: 'What is your age?',
      type: 'text',
      placeholder: 'Example: 21',
      required: true
    },
    {
      id: 'education',
      prompt: 'What is your educational background?',
      type: 'text',
      placeholder: 'Example: B.Tech CSE, Grade 11 Science, MBA',
      required: true
    },
    {
      id: 'dailyStudyTime',
      prompt: 'How much time can you study daily?',
      type: 'chips',
      options: DAILY_STUDY_TIME_OPTIONS,
      required: true
    },
    {
      id: 'learningStyle',
      prompt: 'What is your preferred learning style?',
      type: 'chips',
      options: LEARNING_STYLE_OPTIONS,
      required: true
    },
    {
      id: 'learningSpeed',
      prompt: 'What learning speed do you prefer?',
      type: 'chips',
      options: LEARNING_SPEED_OPTIONS,
      required: true
    },
    {
      id: 'endGoal',
      prompt: 'What is your end goal?',
      type: 'chips',
      options: END_GOAL_OPTIONS,
      required: true
    },
    {
      id: 'existingKnowledge',
      prompt: 'Tell me your existing knowledge in this area.',
      type: 'text',
      placeholder: 'What do you already know?',
      required: false
    },
    {
      id: 'domainKnowledge',
      prompt: getSkillFollowUpQuestion(topic),
      type: 'text',
      placeholder: 'Share your past experience',
      required: false
    }
  ];
}

export function buildAdaptiveInterviewQuestions(topic = '', knownProfile = {}, context = {}) {
  const profile = knownProfile || {};
  const hasBasicProfile = Boolean(
    profile.age ||
    profile.education ||
    profile.dailyStudyTime ||
    profile.learningStyle ||
    profile.learningSpeed ||
    profile.endGoal ||
    profile.preferredLanguage ||
    profile.currentLevel
  );

  if (context?.mode === 'skill' || context?.mode === 'ambiguous') {
    if (hasBasicProfile) {
      return [{
        id: 'reason',
        prompt: 'Why do you want to learn it?',
        type: 'chips',
        options: LEARNING_REASON_OPTIONS,
        required: true
      }];
    }

    const baseQuestions = buildBaseLearningInterviewQuestions(topic);
    const filtered = baseQuestions.filter((question) => {
      if (question.id === 'learnTopic' && topic) return false;
      if (question.id === 'preferredLanguage' && profile.preferredLanguage) return false;
      if (question.id === 'age' && profile.age) return false;
      if (question.id === 'education' && profile.education) return false;
      if (question.id === 'dailyStudyTime' && profile.dailyStudyTime) return false;
      if (question.id === 'learningStyle' && profile.learningStyle) return false;
      if (question.id === 'learningSpeed' && profile.learningSpeed) return false;
      if (question.id === 'endGoal' && profile.endGoal) return false;
      return true;
    });

    return filtered.slice(0, 3);
  }

  if (hasBasicProfile) {
    return [{
      id: 'reason',
      prompt: 'Why do you want to learn it?',
      type: 'chips',
      options: LEARNING_REASON_OPTIONS,
      required: true
    }];
  }

  return [];
}

export function determineInterviewRequirement({ sourceType = '', topicConfidence = 0, profile = {}, learningGoal = '', existingSession = null } = {}) {
  const normalizedSource = String(sourceType || '').toLowerCase();
  const hasContentInput = ['pdf', 'docx', 'ppt', 'pptx', 'image', 'handwritten', 'text', 'website', 'youtube', 'camera', 'voice', 'document', 'audio', 'video'].some((token) => normalizedSource.includes(token));
  const hasSkillGoal = Boolean(learningGoal && /skill|python|trading|ai|react|marketing|cyber|business|design|coding|programming/i.test(String(learningGoal)));

  if (existingSession) {
    return 'NO_INTERVIEW';
  }

  if (hasContentInput) {
    return topicConfidence >= 0.8 ? 'NO_INTERVIEW' : 'ONE_CONFIRMATION';
  }

  if (hasSkillGoal) {
    return 'ADAPTIVE_INTERVIEW';
  }

  return 'NO_INTERVIEW';
}

export function buildLearningInterviewQuestions(topic = '') {
  return buildBaseLearningInterviewQuestions(topic);
}

export function toLearningInterviewPayload(answers = {}, context = {}) {
  const clean = {
    learnTopic: answers.learnTopic || '',
    reason: answers.reason || '',
    currentLevel: answers.currentLevel || '',
    preferredLanguage: answers.preferredLanguage || '',
    age: answers.age || '',
    education: answers.education || '',
    dailyStudyTime: answers.dailyStudyTime || '',
    learningStyle: answers.learningStyle || '',
    learningSpeed: answers.learningSpeed || '',
    endGoal: answers.endGoal || '',
    existingKnowledge: answers.existingKnowledge || '',
    domainKnowledge: answers.domainKnowledge || ''
  };

  return {
    profile: {
      userId: context.userId || 'guest',
      sessionId: context.sessionId || '',
      topic: clean.learnTopic,
      age: clean.age,
      education: clean.education,
      currentLevel: clean.currentLevel,
      existingKnowledge: clean.existingKnowledge,
      domainKnowledge: clean.domainKnowledge,
      sourceContext: context.sourceContext || 'general',
      sourceLabel: context.sourceLabel || ''
    },
    goal: {
      userId: context.userId || 'guest',
      sessionId: context.sessionId || '',
      topic: clean.learnTopic,
      reason: clean.reason,
      endGoal: clean.endGoal,
      learningSpeed: clean.learningSpeed
    },
    preference: {
      userId: context.userId || 'guest',
      sessionId: context.sessionId || '',
      preferredLanguage: clean.preferredLanguage,
      learningStyle: clean.learningStyle,
      dailyStudyTime: clean.dailyStudyTime
    },
    session: {
      userId: context.userId || 'guest',
      sessionId: context.sessionId || '',
      sourceContext: context.sourceContext || 'general',
      sourceLabel: context.sourceLabel || '',
      topicId: context.topicId || '',
      flowType: context.flowType || 'skill-first',
      questions: Array.isArray(context.questions) ? context.questions : [],
      status: context.status || 'in_progress',
      currentStep: Number.isFinite(context.currentStep) ? context.currentStep : 0,
      answers: clean,
      updatedAtMs: Date.now()
    }
  };
}
