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

function normalizeUserTopic(rawValue = '') {
  const normalized = String(rawValue || '').trim();
  if (!normalized) return '';

  const cleaned = normalized
    .replace(/^(this|that|these|those)\s+(image|photo|picture|diagram|document|file|content|lesson|topic|video|audio)\s+(shows|is|contains|about|covers|teaches|describes)\s+/i, '')
    .replace(/^i\s+(want|would|need|am|can)\s+(to\s+)?(learn|study|understand|explore|review|see|know)\s+about\s+/i, '')
    .replace(/^about\s+/i, '')
    .replace(/^(the|a|an)\s+/i, '')
    .replace(/^(topic|lesson|course|module)\s+/i, '')
    .replace(/\s+(topic|lesson|course|module)$/i, '')
    .replace(/^[^a-z0-9]+/i, '')
    .split(/[.!?]/)[0]
    .trim();

  if (!cleaned) return '';

  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1).trim();
}

export function resolveLearningTopic({
  filename = '',
  extractedText = '',
  visionAnalysis = '',
  interviewTopic = '',
  userDescription = ''
} = {}) {
  const cleanedFilename = String(filename || '').replace(/\.(pdf|docx|pptx?|txt|md|html?|json|csv|png|jpe?g|webp|gif)$/i, '').replace(/[_-]+/g, ' ').trim();
  const normalizedText = String(extractedText || visionAnalysis || '').trim();
  const textTopic = normalizedText
    .split(/\n|\. /)
    .map((line) => line.trim())
    .find((line) => line.length > 6 && !/^((the|a|an|this|that|these|those)\s)/i.test(line));
  const userTopic = normalizeUserTopic(String(userDescription || interviewTopic || ''));

  if (userTopic) {
    return { topic: userTopic, confirmed: true, source: 'user-description' };
  }

  if (visionAnalysis && !/^i couldn't|unable to|unclear|image/i.test(String(visionAnalysis).toLowerCase())) {
    const visionTopic = String(visionAnalysis).split(/\.|\n/).find((segment) => segment.trim().length > 6);
    if (visionTopic) {
      return { topic: visionTopic.trim(), confirmed: true, source: 'vision-analysis' };
    }
  }

  if (textTopic) {
    return { topic: textTopic.replace(/^([A-Z][a-z]+\s+){0,3}/, '').slice(0, 120), confirmed: true, source: 'extracted-text' };
  }

  if (cleanedFilename && !/^screenshot|image|file|document|upload/i.test(cleanedFilename.toLowerCase())) {
    return { topic: cleanedFilename, confirmed: false, source: 'filename' };
  }

  return { topic: 'Topic not detected yet', confirmed: false, source: 'unknown' };
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
    practiceQuestions: ['Summarize the main takeaways in your own words.', 'List the most important concepts and explain them.'],
    quiz: [],
    flashcards: [],
    revisionNotes: summaryText,
    cheatSheet: summaryText,
    mindMap: `${lessonTitle} -> concepts -> practice -> review`,
    learningRoadmap: ['Understand the main topic', 'Break it into concepts', 'Practice recall and examples', 'Review weak points']
  };
}
