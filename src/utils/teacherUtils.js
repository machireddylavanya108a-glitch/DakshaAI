export function normalizeTeacherLesson(payload = {}, topic = '') {
  const fallbackTopic = topic || 'your topic';
  const importantPoints = Array.isArray(payload?.importantPoints)
    ? payload.importantPoints
    : Array.isArray(payload?.important_points)
      ? payload.important_points
      : [`Understand the key concept first.`, `Practice by applying it to a real situation.`];
  const commonMistakes = Array.isArray(payload?.commonMistakes)
    ? payload.commonMistakes
    : Array.isArray(payload?.common_mistakes)
      ? payload.common_mistakes
      : [`Skipping the fundamentals.`, `Trying to memorize without understanding.`];

  return {
    topic: payload?.topic || fallbackTopic,
    title: payload?.title || `${fallbackTopic} Lesson`,
    beginner: payload?.beginner || `Start with the foundation of ${fallbackTopic} and understand the main idea clearly.`,
    intermediate: payload?.intermediate || `Connect the concept to a practical example and explain the next layer of understanding.`,
    advanced: payload?.advanced || `Discuss the deeper implications, trade-offs, and nuanced application of ${fallbackTopic}.`,
    examples: Array.isArray(payload?.examples) && payload.examples.length > 0 ? payload.examples : [`A real-life example for ${fallbackTopic}.`],
    importantPoints,
    commonMistakes,
    summary: payload?.summary || `A strong summary of ${fallbackTopic} should connect the basics, examples, and the main takeaway.`,
    difficulty: payload?.difficulty || 'Beginner'
  };
}
