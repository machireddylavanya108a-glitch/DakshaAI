export const PRACTICE_TYPES = [
  'Multiple Choice',
  'True/False',
  'Fill in the blanks',
  'Short answer',
  'Long answer',
  'Coding',
  'Case study',
  'Diagram labeling',
  'Drag & Drop',
  'Image Identification',
  'Voice Answer',
  'Essay',
  'Calculation',
  'Simulation',
  'Interactive 3D Tasks'
];

export const DIFFICULTY_LEVELS = ['Beginner', 'Easy', 'Medium', 'Hard', 'Expert', 'Adaptive'];

function normalizeText(value, fallback = '') {
  return String(value || fallback).trim();
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function firstWeakConcept(weakConcepts, lessonTopic) {
  const first = asArray(weakConcepts).find(Boolean);
  return first || `${lessonTopic} fundamentals`;
}

function buildAnswerKey(questionType, lessonTopic, weakConcept) {
  switch (questionType) {
    case 'Multiple Choice':
      return `${weakConcept} with practical reasoning`;
    case 'True/False':
      return 'True';
    case 'Fill in the blanks':
      return 'concept, application';
    case 'Short answer':
      return `${lessonTopic} improves when the learner connects concept to example.`;
    case 'Long answer':
      return `A complete answer should define ${lessonTopic}, explain ${weakConcept}, and apply it in a real scenario.`;
    case 'Coding':
      return 'function solveTask(input) { return input; }';
    case 'Case study':
      return 'Identify root cause, choose strategy, and justify trade-offs.';
    case 'Diagram labeling':
      return `${weakConcept}: input -> process -> output`;
    case 'Drag & Drop':
      return 'Order: Understand -> Plan -> Execute -> Review';
    case 'Image Identification':
      return `${weakConcept}`;
    case 'Voice Answer':
      return `Explain ${weakConcept} in simple words with one example.`;
    case 'Essay':
      return `An essay should cover concept, evidence, counterpoint, and conclusion about ${lessonTopic}.`;
    case 'Calculation':
      return '6';
    case 'Simulation':
      return 'Run scenario, observe output, explain adjustments.';
    case 'Interactive 3D Tasks':
      return 'Select the correct part, rotate view, and explain function.';
    default:
      return `${lessonTopic} explanation with clear reasoning.`;
  }
}

function buildPrompt(questionType, lessonTopic, weakConcept, ageGroup) {
  const ageTone = ageGroup === 'child' ? 'in simple school language' : ageGroup === 'teen' ? 'with one relatable example' : 'with professional clarity';
  switch (questionType) {
    case 'Multiple Choice':
      return `Which option best explains ${weakConcept} in ${lessonTopic}?`;
    case 'True/False':
      return `True or False: mastering ${weakConcept} helps solve real ${lessonTopic} problems.`;
    case 'Fill in the blanks':
      return `Complete: ${lessonTopic} requires ____ and ____ for reliable performance.`;
    case 'Short answer':
      return `In 2 lines, explain ${weakConcept} ${ageTone}.`;
    case 'Long answer':
      return `Describe how ${weakConcept} influences outcomes in ${lessonTopic}. Include why, how, and where used.`;
    case 'Coding':
      return `Write a short code snippet that models ${weakConcept}.`;
    case 'Case study':
      return `Case: a learner repeatedly fails at ${weakConcept}. What action plan would you propose first?`;
    case 'Diagram labeling':
      return `Label the key stages of ${weakConcept} in a flow diagram.`;
    case 'Drag & Drop':
      return `Arrange the steps of solving a ${lessonTopic} task in correct order.`;
    case 'Image Identification':
      return `Identify the part/concept in the image most related to ${weakConcept}.`;
    case 'Voice Answer':
      return `Give a voice explanation: what is ${weakConcept} and why does it matter?`;
    case 'Essay':
      return `Write an essay on how ${lessonTopic} can be mastered through feedback and iteration.`;
    case 'Calculation':
      return 'If a learner solves 18 questions in 3 rounds, how many questions per round?';
    case 'Simulation':
      return `Simulate a decision flow for ${weakConcept} and explain the result.`;
    case 'Interactive 3D Tasks':
      return `In the 3D model, find and explain the component linked to ${weakConcept}.`;
    default:
      return `Explain ${weakConcept} in ${lessonTopic}.`;
  }
}

function buildOptions(questionType, lessonTopic, weakConcept) {
  if (questionType === 'Multiple Choice') {
    return [
      `${weakConcept} with practical reasoning`,
      `Memorize terms without understanding ${lessonTopic}`,
      'Skip feedback and retry randomly',
      'Ignore mistakes and move on'
    ];
  }
  if (questionType === 'True/False') return ['True', 'False'];
  return [];
}

function buildDifficulty(difficulty, index, learningSpeed, pastMistakesCount) {
  if (difficulty !== 'Adaptive') return difficulty;
  const ramp = index + (learningSpeed === 'fast' ? 2 : learningSpeed === 'slow' ? -1 : 0) - Math.min(2, pastMistakesCount);
  if (ramp <= 2) return 'Easy';
  if (ramp <= 6) return 'Medium';
  if (ramp <= 10) return 'Hard';
  return 'Expert';
}

export function generatePracticeSet(config = {}) {
  const lessonTopic = normalizeText(config.lesson || config.topic, 'General Lesson');
  const skillLevel = normalizeText(config.skillLevel, 'intermediate');
  const ageGroup = normalizeText(config.ageGroup, 'adult').toLowerCase();
  const weakConcepts = asArray(config.weakConcepts);
  const pastMistakes = asArray(config.pastMistakes);
  const learningSpeed = normalizeText(config.learningSpeed, 'normal').toLowerCase();
  const difficulty = DIFFICULTY_LEVELS.includes(config.difficulty) ? config.difficulty : 'Adaptive';
  const baseConcept = firstWeakConcept(weakConcepts, lessonTopic);

  const questions = PRACTICE_TYPES.map((type, index) => {
    const selectedWeak = weakConcepts[index % Math.max(1, weakConcepts.length)] || baseConcept;
    const questionDifficulty = buildDifficulty(difficulty, index, learningSpeed, pastMistakes.length);
    return {
      id: `practice-${Date.now()}-${index + 1}`,
      index: index + 1,
      type,
      difficulty: questionDifficulty,
      prompt: buildPrompt(type, lessonTopic, selectedWeak, ageGroup),
      options: buildOptions(type, lessonTopic, selectedWeak),
      answer: buildAnswerKey(type, lessonTopic, selectedWeak),
      explanation: `This checks ${selectedWeak}. Strong answers connect concept and practical use in ${lessonTopic}.`,
      hint: `Focus on ${selectedWeak}. Use one concrete example and one reason.`,
      concept: selectedWeak,
      skillLevel
    };
  });

  const recommendations = [
    `Replay lesson section on ${baseConcept}.`,
    `Prioritize ${learningSpeed === 'slow' ? 'easy-medium' : 'medium-hard'} mixed drills.`,
    'Review mistakes before attempting new expert-level tasks.'
  ];

  return {
    id: `session-${Date.now()}`,
    topic: lessonTopic,
    skillLevel,
    ageGroup,
    difficulty,
    learningSpeed,
    weakConcepts,
    pastMistakes,
    questions,
    recommendations,
    createdAt: Date.now()
  };
}

function normalizeForCompare(value) {
  return String(value || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function evaluateCorrectness(question, learnerAnswer) {
  const expected = normalizeForCompare(question.answer);
  const actual = normalizeForCompare(learnerAnswer);
  if (!actual) return false;

  if (question.type === 'Multiple Choice' || question.type === 'True/False') {
    return expected === actual;
  }

  if (question.type === 'Calculation') {
    const expectedNumber = Number(expected.replace(/[^0-9.-]/g, ''));
    const actualNumber = Number(actual.replace(/[^0-9.-]/g, ''));
    return !Number.isNaN(expectedNumber) && expectedNumber === actualNumber;
  }

  const expectedTokens = expected.split(' ').filter(Boolean);
  const hitCount = expectedTokens.filter((token) => actual.includes(token)).length;
  return hitCount >= Math.max(2, Math.round(expectedTokens.length * 0.35));
}

export function evaluatePracticeAnswer(question, payload = {}) {
  const learnerAnswer = normalizeText(payload.answer, '');
  const confidence = clamp(Number(payload.confidence || 50), 0, 100);
  const responseTimeSec = Math.max(1, Number(payload.responseTimeSec || 30));
  const correct = evaluateCorrectness(question, learnerAnswer);
  const speedScore = clamp(Math.round(100 - responseTimeSec * 1.3), 25, 100);
  const confidenceScore = correct ? confidence : Math.round(confidence * 0.6);
  const basePoints = correct ? 100 : 30;
  const weightedPoints = Math.round((basePoints * 0.6) + (speedScore * 0.2) + (confidenceScore * 0.2));

  return {
    correct,
    weightedPoints,
    responseTimeSec,
    confidence,
    speedScore,
    confidenceScore,
    smartFeedback: {
      whyWrong: correct
        ? 'Answer is correct. Keep the same reasoning pattern.'
        : `Your answer missed the key concept: ${question.concept}.`,
      correctAnswer: question.answer,
      replayLessonSection: `Replay the section covering ${question.concept}.`,
      highlightImportantConcepts: [question.concept, question.type, question.difficulty],
      recommendedPractice: correct
        ? `Try a harder ${question.type} question on ${question.concept}.`
        : `Repeat ${question.type} with guided hints for ${question.concept}.`
    }
  };
}

export function buildAdaptiveDifficulty(latestResult, previousSessions = []) {
  const recent = previousSessions.slice(0, 3);
  const historicalAccuracy = recent.length
    ? Math.round(recent.reduce((sum, item) => sum + Number(item.accuracy || 0), 0) / recent.length)
    : 0;
  const baseline = Math.round((Number(latestResult.accuracy || 0) * 0.7) + (historicalAccuracy * 0.3));

  if (baseline >= 90) return 'Expert';
  if (baseline >= 78) return 'Hard';
  if (baseline >= 62) return 'Medium';
  if (baseline >= 45) return 'Easy';
  return 'Beginner';
}

export function buildSessionScoreCard(questions = [], results = [], previousSessions = []) {
  const total = Math.max(1, questions.length);
  const correctCount = results.filter((item) => item.correct).length;
  const accuracy = Math.round((correctCount / total) * 100);
  const speed = Math.round(results.reduce((sum, item) => sum + Number(item.speedScore || 0), 0) / total);
  const confidence = Math.round(results.reduce((sum, item) => sum + Number(item.confidenceScore || 0), 0) / total);
  const weakTopics = Array.from(new Set(results.filter((item) => !item.correct).map((item) => item.concept))).filter(Boolean);
  const strongTopics = Array.from(new Set(results.filter((item) => item.correct).map((item) => item.concept))).filter(Boolean);

  const previousLearningScore = previousSessions.length
    ? Math.round(previousSessions.reduce((sum, item) => sum + Number(item.learningScore || 0), 0) / previousSessions.length)
    : 50;

  const improvement = clamp(Math.round(((accuracy + speed) / 2) - previousLearningScore), -30, 30);
  const learningScore = clamp(Math.round((accuracy * 0.45) + (speed * 0.2) + (confidence * 0.15) + ((100 - weakTopics.length * 10) * 0.2)), 0, 100);

  return {
    accuracy,
    speed,
    confidence,
    improvement,
    weakTopics,
    strongTopics,
    learningScore
  };
}

export function getCertificateReadiness(scoreCard) {
  const score = Number(scoreCard?.learningScore || 0);
  if (score >= 85) return 'Ready';
  if (score >= 65) return 'Almost Ready';
  return 'Needs Practice';
}

export function buildAnalytics(results = []) {
  const total = results.length || 0;
  const accuracy = total ? Math.round(results.reduce((sum, item) => sum + Number(item.accuracy || 0), 0) / total) : 0;
  const speed = total ? Math.round(results.reduce((sum, item) => sum + Number(item.speed || 0), 0) / total) : 0;
  const confidence = total ? Math.round(results.reduce((sum, item) => sum + Number(item.confidence || 0), 0) / total) : 0;

  const weakTopics = Array.from(new Set(results.flatMap((item) => asArray(item.weakTopics)))).slice(0, 8);
  const strongTopics = Array.from(new Set(results.flatMap((item) => asArray(item.strongTopics)))).slice(0, 8);

  return {
    accuracy,
    speed,
    confidence,
    completion: total ? 100 : 0,
    weakTopics,
    strongTopics,
    learningScore: total ? Math.round(results.reduce((sum, item) => sum + Number(item.learningScore || 0), 0) / total) : 0,
    improvement: total ? Math.round(results.reduce((sum, item) => sum + Number(item.improvement || 0), 0) / total) : 0
  };
}

export function adaptDifficulty(accuracy, speed, history = []) {
  return buildAdaptiveDifficulty({ accuracy, speed }, history);
}

export function buildPracticeSet(topic = 'Practice Topic', difficulty = 'Adaptive') {
  return generatePracticeSet({
    lesson: topic,
    difficulty,
    weakConcepts: [],
    pastMistakes: [],
    skillLevel: 'intermediate',
    ageGroup: 'adult',
    learningSpeed: 'normal'
  });
}
