export function normalizeInterviewQuestions(questions = [], topic = '') {
  const categories = ['Beginner', 'Intermediate', 'Advanced'];
  const safeQuestions = Array.isArray(questions) ? questions.filter(Boolean) : [];

  return categories.map((category, categoryIndex) => {
    const baseQuestions = safeQuestions[categoryIndex] ? [safeQuestions[categoryIndex]] : [];
    const fallback = [
      `Explain the core idea of ${topic} in simple terms.`,
      `Describe a practical use case for ${topic}.`,
      `Discuss a challenge and how you would solve it in ${topic}.`
    ];

    return {
      category,
      questions: (baseQuestions.length > 0 ? baseQuestions : [fallback[categoryIndex] || fallback[0]]).map((item, index) => ({
        id: `${category.toLowerCase()}-${index}`,
        question: typeof item === 'string' ? `${item} (${topic})` : item.question || `How would you approach ${topic}?`,
        answer: typeof item === 'string' ? `A strong answer should explain the concept clearly, support it with an example, and reflect on tradeoffs.` : item.answer || 'A strong answer should explain the concept clearly, support it with an example, and reflect on tradeoffs.'
      }))
    };
  });
}
