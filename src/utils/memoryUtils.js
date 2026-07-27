export function summarizeText(value) {
  if (!value) return '';
  const text = String(value).toLowerCase();
  return text.replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function toMs(value) {
  if (!value) return 0;
  if (typeof value === 'number') return value;
  if (value?.toMillis) return value.toMillis();
  if (value?.toDate) return value.toDate().getTime();
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function fmtDate(value) {
  const ms = toMs(value);
  return ms ? new Date(ms).toLocaleString() : 'recent';
}

function uniqueValues(items) {
  return Array.from(new Set((items || []).filter(Boolean)));
}

function topWords(text, limit = 10) {
  const words = summarizeText(text).split(' ').filter((word) => word.length >= 4);
  const map = new Map();
  words.forEach((word) => map.set(word, (map.get(word) || 0) + 1));
  return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, limit).map(([word]) => word);
}

function buildStreaks(timestamps = []) {
  const days = uniqueValues(timestamps.map((stamp) => {
    const ms = toMs(stamp);
    if (!ms) return '';
    const date = new Date(ms);
    return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
  }));

  const daily = days.length;
  const weekly = Math.max(1, Math.round(daily / 7));
  const monthly = Math.max(1, Math.round(daily / 30));
  return {
    dailyStreak: clamp(daily, 0, 365),
    weeklyStreak: clamp(weekly, 0, 52),
    monthlyStreak: clamp(monthly, 0, 24)
  };
}

function buildKnowledgeGraph(concepts = [], strongConcepts = [], weakConcepts = []) {
  const root = 'Learner';
  const nodes = [root, ...uniqueValues([...concepts, ...strongConcepts, ...weakConcepts]).slice(0, 14)];
  const edges = nodes.slice(1).map((concept) => `${root} -> ${concept}`);
  return { nodes, edges };
}

function buildSkillTree(interests = [], strongConcepts = [], weakConcepts = []) {
  const baseSkills = uniqueValues([...interests, ...strongConcepts]).slice(0, 8);
  return baseSkills.map((skill, index) => ({
    skill,
    level: clamp(20 + (index * 8) + (strongConcepts.includes(skill) ? 20 : 0) - (weakConcepts.includes(skill) ? 10 : 0), 1, 100),
    status: weakConcepts.includes(skill) ? 'Needs Practice' : 'Growing'
  }));
}

function buildAchievements(trackEverything, progressDashboard) {
  const badges = [];
  if ((trackEverything.dailyStreak || 0) >= 7) badges.push('7-Day Streak');
  if ((trackEverything.lessons || 0) >= 20) badges.push('Lesson Explorer');
  if ((trackEverything.quizzes || 0) >= 10) badges.push('Quiz Challenger');
  if ((trackEverything.practice || 0) >= 10) badges.push('Practice Warrior');
  if ((progressDashboard.level || 0) >= 5) badges.push('Level 5 Achiever');

  const achievements = badges.map((item, index) => ({
    id: `ach-${index + 1}`,
    title: item,
    unlockedAt: Date.now(),
    xpReward: 60 + index * 15
  }));

  return { badges, achievements };
}

function buildRecommendations({ weakConcepts, strongConcepts, interests, favoriteLanguage }) {
  return {
    lessons: [`Revise ${weakConcepts[0] || 'core fundamentals'} with a 10-minute guided lesson.`],
    books: [`Read a focused chapter on ${interests[0] || 'your current subject'} and summarize it.`],
    videos: [`Watch one short explainer video about ${weakConcepts[0] || 'the weakest concept'}.`],
    practice: [`Complete adaptive practice on ${weakConcepts[0] || 'priority concept'} with immediate feedback.`],
    projects: [`Build a mini-project combining ${strongConcepts[0] || 'strength'} and ${weakConcepts[0] || 'weakness'}.`],
    skills: [`Develop ${(interests[1] || interests[0] || 'problem solving')} skill through weekly challenges.`],
    careerPaths: [`Explore a ${(interests[0] || 'technology')} career path with ${favoriteLanguage || 'English'} resources.`],
    certificates: ['Attempt one certification readiness test this week.']
  };
}

function buildRevisionSchedule(weakConcepts = [], timestamps = []) {
  const now = Date.now();
  const seed = weakConcepts.length ? weakConcepts : ['Core revision'];
  return seed.slice(0, 8).map((concept, index) => {
    const lastSeen = toMs(timestamps[index % Math.max(1, timestamps.length)]) || now;
    const daysSince = Math.max(0, Math.round((now - lastSeen) / (1000 * 60 * 60 * 24)));
    const forgettingRisk = clamp(35 + daysSince * 8, 35, 95);
    const reviseInDays = forgettingRisk > 80 ? 1 : forgettingRisk > 60 ? 2 : 4;
    const nextRevisionAt = now + reviseInDays * 24 * 60 * 60 * 1000;

    return {
      concept,
      forgettingRisk,
      reviseInDays,
      nextRevisionAt,
      revisionType: forgettingRisk > 75 ? 'Urgent Recall' : 'Spaced Revision',
      autoSession: `Revision session for ${concept} with 5 recall prompts and 2 practical tasks.`
    };
  });
}

function buildReminders(revisionSchedule = [], learningGoals = '') {
  const examFocus = /exam|test|assessment|interview/i.test(learningGoals || '');
  return [
    { type: 'Daily Study', message: 'Complete at least 30 minutes of focused study today.' },
    { type: 'Revision', message: `Revise ${revisionSchedule[0]?.concept || 'your weakest concept'} today.` },
    { type: 'Exam', message: examFocus ? 'Run one exam prep block today.' : 'Run one readiness checkpoint this week.' },
    { type: 'Projects', message: 'Move one project milestone forward.' },
    { type: 'Practice', message: 'Finish one adaptive practice set with feedback review.' },
    { type: 'Goals', message: 'Review your weekly learning goals and adjust priorities.' }
  ];
}

export function buildMemoryBrain(payload = {}) {
  const history = Array.isArray(payload.learningHistory) ? payload.learningHistory : [];
  const weakConcepts = uniqueValues(payload.weakConcepts || []);
  const strongConcepts = uniqueValues(payload.strongConcepts || []);
  const timestamps = history.map((item) => item.timestampMs || item.timestamp || item.createdAt || Date.now());

  const textPool = history.map((item) => `${item.title || ''} ${item.summary || ''}`).join(' ');
  const conceptTokens = topWords(textPool, 12);

  const trackEverything = {
    subjects: payload.trackEverything?.subjects || uniqueValues(history.map((item) => item.subject || item.title)).length,
    skills: payload.trackEverything?.skills || uniqueValues(payload.skills || conceptTokens.slice(0, 6)).length,
    lessons: payload.trackEverything?.lessons || history.filter((item) => ['PDF', 'DOCX', 'PPT', 'YouTube', 'Website', 'Voice', 'Lesson'].includes(item.type)).length,
    books: payload.trackEverything?.books || history.filter((item) => /book/i.test(item.title || '')).length,
    pdfs: payload.trackEverything?.pdfs || history.filter((item) => item.type === 'PDF').length,
    videos: payload.trackEverything?.videos || history.filter((item) => item.type === 'YouTube').length,
    questions: payload.trackEverything?.questions || Number(payload.questionCount || 0),
    quizzes: payload.trackEverything?.quizzes || history.filter((item) => item.type === 'Quiz').length,
    practice: payload.trackEverything?.practice || history.filter((item) => item.type === 'Practice').length,
    certificates: payload.trackEverything?.certificates || Number(payload.certificateCount || 0),
    sessions3d: payload.trackEverything?.sessions3d || history.filter((item) => item.type === '3D').length,
    voiceSessions: payload.trackEverything?.voiceSessions || history.filter((item) => item.type === 'Voice').length,
    languages: payload.trackEverything?.languages || uniqueValues(payload.languages || ['English']).length,
    studyTime: payload.trackEverything?.studyTime || Number(payload.studyHours || 0),
    attendance: payload.trackEverything?.attendance || uniqueValues(timestamps.map((value) => new Date(toMs(value)).toDateString())).length,
    ...buildStreaks(timestamps)
  };

  const favoriteLanguage = payload.preferences?.language || payload.favoriteLanguage || 'English';
  const confidence = clamp(Number(payload.confidence || 60), 0, 100);
  const speed = payload.learningSpeed || (payload.avgResponseSec && payload.avgResponseSec < 40 ? 'Fast' : payload.avgResponseSec && payload.avgResponseSec > 90 ? 'Slow' : 'Balanced');

  const learningProfile = {
    learningStyle: payload.learningStyle || (trackEverything.videos > trackEverything.pdfs ? 'Visual + Audio' : 'Read + Practice'),
    strengths: strongConcepts.length ? strongConcepts : conceptTokens.slice(0, 4),
    weaknesses: weakConcepts.length ? weakConcepts : ['Concept reinforcement', 'Applied reasoning'],
    speed,
    confidence,
    interests: uniqueValues(payload.interests || conceptTokens.slice(0, 5)),
    careerGoals: payload.careerGoals || payload.learningGoals || 'Build job-ready skills with projects and certifications.',
    favoriteLanguage,
    preferredTeacherStyle: payload.preferences?.teacherStyle || payload.preferredTeacherStyle || 'friendly'
  };

  const recommendations = buildRecommendations({
    weakConcepts: learningProfile.weaknesses,
    strongConcepts: learningProfile.strengths,
    interests: learningProfile.interests,
    favoriteLanguage
  });

  const dailyProgress = clamp(Math.round((trackEverything.studyTime * 5) + (trackEverything.quizzes * 2)), 0, 100);
  const weeklyProgress = clamp(Math.round(dailyProgress * 1.2), 0, 100);
  const monthlyProgress = clamp(Math.round(weeklyProgress * 1.15), 0, 100);
  const yearlyProgress = clamp(Math.round(monthlyProgress * 1.08), 0, 100);

  const xp = clamp(Math.round(trackEverything.studyTime * 40 + trackEverything.practice * 12 + trackEverything.quizzes * 10 + learningProfile.confidence * 2), 0, 50000);
  const level = Math.max(1, Math.floor(xp / 500));
  const completion = clamp(Math.round((trackEverything.lessons + trackEverything.practice + trackEverything.quizzes) * 2), 0, 100);

  const progressDashboard = {
    dailyProgress,
    weeklyProgress,
    monthlyProgress,
    yearlyProgress,
    knowledgeGraph: buildKnowledgeGraph(conceptTokens, learningProfile.strengths, learningProfile.weaknesses),
    skillTree: buildSkillTree(learningProfile.interests, learningProfile.strengths, learningProfile.weaknesses),
    learningTimeline: history.slice(0, 30).map((item) => ({
      label: item.title || item.type || 'Learning activity',
      type: item.type || 'Activity',
      at: fmtDate(item.timestampMs || item.timestamp)
    })),
    xp,
    level,
    completion
  };

  const achievementData = buildAchievements(trackEverything, progressDashboard);
  progressDashboard.badges = achievementData.badges;
  progressDashboard.achievements = achievementData.achievements;

  const revisionSchedule = buildRevisionSchedule(learningProfile.weaknesses, timestamps);
  const reminders = buildReminders(revisionSchedule, learningProfile.careerGoals);

  const smartMemory = {
    knownConcepts: learningProfile.strengths,
    avoidRepeatingKnownBasics: true,
    autoReviseWeakConcepts: learningProfile.weaknesses,
    revisionSchedule,
    predictForgetting: revisionSchedule.map((item) => ({ concept: item.concept, forgettingRisk: item.forgettingRisk })),
    revisionSessions: revisionSchedule.map((item) => item.autoSession)
  };

  return {
    learningHistory: history,
    weakConcepts: learningProfile.weaknesses,
    strongConcepts: learningProfile.strengths,
    recommendations: Object.values(recommendations).flat(),
    preferences: {
      language: favoriteLanguage,
      teacherStyle: learningProfile.preferredTeacherStyle,
      difficulty: payload.preferences?.difficulty || 'adaptive'
    },
    statistics: {
      totalStudyHours: trackEverything.studyTime,
      lessonsCompleted: trackEverything.lessons,
      averageQuizScore: Number(payload.averageQuizScore || 0),
      learningStreak: trackEverything.dailyStreak,
      lastActivity: history[0]?.timestamp || 'No activity yet'
    },
    memoryBrain: {
      trackEverything,
      learningProfile,
      aiRecommendations: recommendations,
      progressDashboard,
      smartMemory,
      reminders
    },
    revisionSchedule,
    achievements: achievementData.achievements,
    badges: achievementData.badges,
    learningGoals: payload.learningGoals || 'Revise weekly and practice one project every week.',
    memoryNotes: payload.memoryNotes || 'Daksha remembers your behavior and personalizes continuously.'
  };
}

export function buildMemoryProfile(payload = {}) {
  return buildMemoryBrain(payload);
}
