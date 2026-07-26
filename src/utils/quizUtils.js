export function normalizeAnswer(answer = '') {
  return String(answer || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ');
}

export function calculateQuizResult(userAnswers = [], questions = []) {
  const total = Math.max(questions.length, 0);
  let correctAnswers = 0;

  userAnswers.forEach((answer, index) => {
    const question = questions[index];
    if (!question) return;
    const expected = normalizeAnswer(question.answer);
    const given = normalizeAnswer(answer?.answer ?? answer);
    if (expected && given && expected === given) {
      correctAnswers += 1;
    }
  });

  const score = correctAnswers;
  const percentage = total ? Number(((score / total) * 100).toFixed(2)) : 0;
  let grade = 'F';

  if (percentage >= 90) grade = 'A';
  else if (percentage >= 60) grade = 'B';
  else if (percentage >= 40) grade = 'C';
  else if (percentage >= 20) grade = 'D';

  return {
    correctAnswers,
    wrongAnswers: total - correctAnswers,
    score,
    percentage,
    grade,
    total,
  };
}

export function buildDefaultQuiz(topic = 'Untitled Topic') {
  return {
    title: `${topic} Quiz`,
    difficulty: 'Medium',
    questions: [
      {
        question: `What is the main idea of ${topic}?`,
        options: ['A key concept', 'A random guess', 'An unrelated fact', 'A missing answer'],
        answer: 'A key concept',
        explanation: 'This question checks your understanding of the central concept.',
        type: 'multiple-choice',
      },
    ],
  };
}

export function parseQuizPayload(payload) {
  if (!payload || typeof payload !== 'object') return buildDefaultQuiz();
  const title = payload.title || 'Generated Quiz';
  const difficulty = payload.difficulty || 'Medium';
  const questions = Array.isArray(payload.questions) ? payload.questions : [];

  return {
    title,
    difficulty,
    questions: questions.map((question, index) => ({
      question: question?.question || `Question ${index + 1}`,
      options: Array.isArray(question?.options) ? question.options : [],
      answer: question?.answer || '',
      explanation: question?.explanation || 'No explanation provided.',
      type: question?.type || 'multiple-choice',
    })),
  };
}
