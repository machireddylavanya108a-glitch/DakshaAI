const SUPPORTED_TYPES = [
  'MCQ',
  'True/False',
  'Fill Blanks',
  'Voice',
  '3D',
  'Drag Drop',
  'Identify Objects',
  'Arrange Steps',
  'Coding',
  'Math',
  'Simulation',
  'Business Cases',
  'Medical Cases',
  'Engineering Assembly'
];

const DIFFICULTY_LEVELS = ['Easy', 'Medium', 'Hard', 'Expert'];

function normalize(value, fallback = '') {
  return String(value || fallback).trim();
}

function pickQuestionTypes(questionCount, difficulty, profile = {}) {
  const safeCount = Math.max(1, Math.min(questionCount, SUPPORTED_TYPES.length));
  const coreTypes = ['MCQ', 'True/False', 'Fill Blanks', 'Coding'];
  const extraTypes = ['Simulation', 'Voice', 'Drag Drop', 'Arrange Steps', 'Math', '3D', 'Identify Objects'];
  const domainTypes = profile?.focus === 'healthcare'
    ? ['Medical Cases', 'Simulation']
    : profile?.focus === 'engineering'
      ? ['Engineering Assembly', 'Simulation']
      : ['Business Cases', 'Simulation'];

  const requested = [];
  for (let index = 0; index < safeCount; index += 1) {
    if (index < coreTypes.length) {
      requested.push(coreTypes[index]);
    } else if (index === coreTypes.length) {
      requested.push('Simulation');
    } else if (difficulty === 'Expert' && index === coreTypes.length + 1) {
      requested.push('Medical Cases');
    } else if (profile?.focus === 'healthcare' && index === coreTypes.length + 1) {
      requested.push('Medical Cases');
    } else if (profile?.focus === 'engineering' && index === coreTypes.length + 1) {
      requested.push('Engineering Assembly');
    } else {
      const fallback = domainTypes[(index - coreTypes.length - 1) % domainTypes.length];
      requested.push(fallback || extraTypes[(index - coreTypes.length - 1) % extraTypes.length]);
    }
  }

  if (difficulty === 'Expert') {
    return requested.map((type, index) => {
      if (index === 0) return 'Medical Cases';
      if (index === 1) return 'Engineering Assembly';
      return type;
    });
  }

  if (profile?.focus === 'healthcare') {
    return requested.map((type, index) => (index === 1 ? 'Medical Cases' : type));
  }

  if (profile?.focus === 'engineering') {
    return requested.map((type, index) => (index === 1 ? 'Engineering Assembly' : type));
  }

  return requested;
}

function buildPrompt(type, topic, difficulty, profile = {}) {
  const focus = normalize(profile?.focus, 'general');
  const weakness = normalize(profile?.weaknesses?.[0], 'core concepts');
  const strength = normalize(profile?.strengths?.[0], 'practical reasoning');
  const style = normalize(profile?.learningStyle, 'guided');

  const base = `${topic} on ${weakness}`;

  switch (type) {
    case 'MCQ':
      return `Choose the best answer for ${base} using ${strength} as the reasoning anchor.`;
    case 'True/False':
      return `Decide whether the statement about ${base} is true or false.`;
    case 'Fill Blanks':
      return `Complete the sentence about ${base} using the most precise term.`;
    case 'Voice':
      return `Explain ${base} out loud as if teaching a peer in a ${style} style.`;
    case '3D':
      return `Interpret the 3D scene related to ${topic} and identify the key component.`;
    case 'Drag Drop':
      return `Reorder the steps for solving a ${topic} problem from first to last.`;
    case 'Identify Objects':
      return `Select the object or component that best matches the description for ${topic}.`;
    case 'Arrange Steps':
      return `Arrange the workflow for ${topic} into the right sequence.`;
    case 'Coding':
      return `Write or complete a short snippet that solves a ${topic} task.`;
    case 'Math':
      return `Solve the numerical challenge about ${topic} and show the reasoning.`;
    case 'Simulation':
      return `Simulate the outcome of the ${focus} scenario for ${topic}.`;
    case 'Business Cases':
      return `Evaluate the business case involving ${topic} and recommend the best response.`;
    case 'Medical Cases':
      return `Analyze the medical case for ${topic} and identify the safest next step.`;
    case 'Engineering Assembly':
      return `Assemble the components for ${topic} in the correct order and explain why.`;
    default:
      return `Assess understanding of ${topic} at ${difficulty.toLowerCase()} difficulty.`;
  }
}

function buildAnswer(type, topic, difficulty, profile = {}) {
  const weakness = normalize(profile?.weaknesses?.[0], 'core concepts');
  switch (type) {
    case 'MCQ':
      return 'The most defensible option is the one that best matches the concept and context.';
    case 'True/False':
      return 'True';
    case 'Fill Blanks':
      return 'concept';
    case 'Voice':
      return `Explain ${topic} in simple terms and connect it to ${weakness}.`;
    case '3D':
      return 'Select the highlighted object that corresponds to the target concept.';
    case 'Drag Drop':
      return 'Reorder the steps into a correct learning sequence.';
    case 'Identify Objects':
      return 'Identify the object linked to the concept.';
    case 'Arrange Steps':
      return 'Arrange the steps in sequential order.';
    case 'Coding':
      return 'Write a short function that solves the task clearly.';
    case 'Math':
      return 'Apply the formula and show the final calculation.';
    case 'Simulation':
      return 'Explain the observed outcome and the decision that changes it.';
    case 'Business Cases':
      return 'Recommend the option that balances risk, value, and feasibility.';
    case 'Medical Cases':
      return 'Choose the safest evidence-based next step.';
    case 'Engineering Assembly':
      return 'The assembly should follow the intended sequence and constraints.';
    default:
      return `Understand ${topic} at ${difficulty.toLowerCase()} level.`;
  }
}

function buildOptions(type) {
  switch (type) {
    case 'MCQ':
      return ['Most accurate explanation', 'Closest distractor', 'Common misconception', 'Irrelevant detail'];
    case 'True/False':
      return ['True', 'False'];
    case 'Fill Blanks':
      return [];
    default:
      return [];
  }
}

function chooseDifficulty(difficulty, index) {
  const normalized = DIFFICULTY_LEVELS.includes(difficulty) ? difficulty : 'Medium';
  if (normalized === 'Easy' || normalized === 'Medium' || normalized === 'Hard' || normalized === 'Expert') {
    return normalized;
  }
  return index < 2 ? 'Easy' : index < 4 ? 'Medium' : 'Hard';
}

export function buildAdaptiveAssessment({
  topic = 'General Topic',
  difficulty = 'Medium',
  questionCount = 10,
  learnerProfile = {}
} = {}) {
  const safeCount = Math.max(1, Math.min(Number(questionCount) || 10, 12));
  const types = pickQuestionTypes(safeCount, difficulty, learnerProfile);

  const questions = types.slice(0, safeCount).map((type, index) => ({
    id: `assessment-${index + 1}`,
    type,
    difficulty: chooseDifficulty(difficulty, index),
    question: buildPrompt(type, topic, difficulty, learnerProfile),
    options: buildOptions(type),
    answer: buildAnswer(type, topic, difficulty, learnerProfile),
    explanation: `This question is tuned for ${normalize(learnerProfile?.goal, 'skill growth')} and the learner's ${normalize(learnerProfile?.learningStyle, 'guided')} style.`,
    personalization: {
      goal: normalize(learnerProfile?.goal, 'skill growth'),
      learningStyle: normalize(learnerProfile?.learningStyle, 'guided'),
      focus: normalize(learnerProfile?.focus, 'general'),
      weakness: normalize(learnerProfile?.weaknesses?.[0], 'core concepts')
    }
  }));

  return {
    title: `${normalize(topic, 'Adaptive Assessment')} Assessment`,
    difficulty,
    questionCount: questions.length,
    types: questions.map((question) => question.type),
    questions
  };
}
