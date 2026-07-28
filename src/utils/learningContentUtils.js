export function deriveLearningTitle(sourceName = '', fallback = 'Adaptive lesson') {
  const normalized = String(sourceName || '').trim();
  const cleaned = normalized.replace(/\.(pdf|docx|pptx?|txt|md|html?|json|csv)$/i, '').replace(/[_-]+/g, ' ').trim();

  if (!cleaned) return fallback;
  if (/^(http|https):\/\//i.test(cleaned)) return fallback;
  if (/^file:/i.test(cleaned)) return fallback;

  const withoutLabel = cleaned
    .replace(/^(lesson|topic|course|module|content|source|upload|document|material|analysis)\s+/i, '')
    .replace(/\s+(lesson|topic|course|module|content|source|upload|document|material|analysis)$/i, '');

  const keywords = withoutLabel
    .split(/\s+/)
    .filter(Boolean)
    .filter((word) => !/^(explain|explains|about|the|a|an|for|from|with|and|or|of|to|in|on|into|using|learn|learning|study|understand|understanding|guide|overview|intro|introduction|notes|file)$/i.test(word));

  if (!keywords.length) return fallback;

  if (keywords.length >= 2 && /system|network|design|analysis|engineering|science|learning|development|planning/i.test(keywords[1])) {
    return `${keywords[0]} ${keywords[1]}`.replace(/^./, (char) => char.toUpperCase());
  }

  if (keywords.length >= 3 && /basic|basics|fundamentals|fundamental|guide|intro|overview|introduction/i.test(keywords[2])) {
    return keywords.slice(0, 3).join(' ').replace(/^./, (char) => char.toUpperCase());
  }

  return keywords.slice(0, Math.min(3, keywords.length)).join(' ').replace(/^./, (char) => char.toUpperCase());
}

export function buildFallbackLessonPackage({ title = 'Adaptive lesson', summary = 'The lesson content is being prepared from available material.' } = {}) {
  const lessonTitle = deriveLearningTitle(title, 'Adaptive lesson');
  const summaryText = String(summary || '').trim() || 'The lesson content is being prepared from available material.';

  return {
    completeCourse: `${lessonTitle}: ${summaryText}`,
    beginnerExplanation: `Start with the key ideas in ${lessonTitle} and build understanding from the main concepts first.`,
    intermediateExplanation: `Connect the main ideas in ${lessonTitle} to practical examples and short recall drills.`,
    advancedExplanation: `Use ${lessonTitle} to explore deeper application, comparison, and refined practice.`,
    realWorldExamples: ['Apply the lesson to a practical scenario you can observe or recreate.'],
    interviewQuestions: ['What is the core idea of this lesson?', 'How would you explain it to a beginner?'],
    practiceQuestions: ['Summarize the main takeaways in your own words.', 'List the most important concepts and explain one example.'],
    quiz: [],
    flashcards: [],
    revisionNotes: summaryText,
    cheatSheet: summaryText,
    mindMap: `${lessonTitle} -> concepts -> practice -> review`,
    learningRoadmap: ['Understand the main topic', 'Break it into concepts', 'Practice recall and examples', 'Review weak points']
  };
}
