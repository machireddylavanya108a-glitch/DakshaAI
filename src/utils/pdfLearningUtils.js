export function buildPdfLearningModel(text = '', fileName = 'document.pdf') {
  const normalized = String(text || '').replace(/\s+/g, ' ').trim();
  const lines = String(text || '').split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const headings = lines.filter((line) => line.length < 120 && /^(#|chapter|section|part|topic|introduction|summary|conclusion)/i.test(line));
  const subHeadings = lines.filter((line) => line.length < 120 && /^(\d+\.|[A-Z][A-Za-z0-9\s&()/-]{2,})/.test(line) && !headings.includes(line));
  const tables = normalized.match(/\|[^\n]+\|/g) || [];
  const formulas = normalized.match(/([A-Za-z0-9\s=+\-*/()^]+={1,2}[^\n]+)/g) || [];
  const codeBlocks = normalized.match(/(```[\s\S]*?```|`[^\n`]+`)/g) || [];
  const definitions = [];

  const words = normalized.split(/\s+/).filter(Boolean);
  const importantTerms = Array.from(new Set(words.slice(0, 20))).filter((word) => word.length > 4);

  return {
    title: fileName.replace(/\.[^/.]+$/, ''),
    overview: normalized.slice(0, 2200) || 'No text extracted.',
    chapters: headings.slice(0, 8),
    subHeadings: subHeadings.slice(0, 12),
    tables: tables.slice(0, 8),
    formulas: formulas.slice(0, 8),
    codeBlocks: codeBlocks.slice(0, 8),
    definitions: definitions.concat(importantTerms.slice(0, 10)).slice(0, 10),
    extractedText: normalized,
  };
}

export function parsePdfLearningPayload(payload) {
  if (!payload || typeof payload !== 'object') {
    return {
      summary: 'No summary available.',
      beginnerLesson: 'Start by understanding the core ideas in this document.',
      intermediateLesson: 'Connect the ideas with real examples and practical use.',
      advancedLesson: 'Dive into deeper insights, trade-offs, and applications.',
      keyPoints: [],
      importantDefinitions: [],
      examples: [],
      realWorldApplications: [],
      revisionNotes: [],
      cheatSheet: [],
      flashcards: [],
      quiz: [],
      mindMap: 'Central idea → supporting concepts → applications',
      learningRoadmap: [],
    };
  }

  return {
    summary: payload.summary || 'No summary available.',
    beginnerLesson: payload.beginnerLesson || payload.beginner || 'Start with the basics.',
    intermediateLesson: payload.intermediateLesson || payload.intermediate || 'Explore the middle layer of concepts.',
    advancedLesson: payload.advancedLesson || payload.advanced || 'Go deeper into nuance and practice.',
    keyPoints: Array.isArray(payload.keyPoints) ? payload.keyPoints : [],
    importantDefinitions: Array.isArray(payload.importantDefinitions) ? payload.importantDefinitions : [],
    examples: Array.isArray(payload.examples) ? payload.examples : [],
    realWorldApplications: Array.isArray(payload.realWorldApplications) ? payload.realWorldApplications : [],
    revisionNotes: Array.isArray(payload.revisionNotes) ? payload.revisionNotes : [],
    cheatSheet: Array.isArray(payload.cheatSheet) ? payload.cheatSheet : [],
    flashcards: Array.isArray(payload.flashcards) ? payload.flashcards : [],
    quiz: Array.isArray(payload.quiz) ? payload.quiz : [],
    mindMap: payload.mindMap || 'Central idea → supporting concepts → applications',
    learningRoadmap: Array.isArray(payload.learningRoadmap) ? payload.learningRoadmap : [],
  };
}
