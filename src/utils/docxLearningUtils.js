export function buildDocxLearningModel(text = '', fileName = 'document.docx') {
  const normalized = String(text || '').replace(/\s+/g, ' ').trim();
  const lines = String(text || '').split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const sections = lines.filter((line) => line.length < 120 && /^(chapter|section|part|overview|summary|introduction|conclusion|topic)/i.test(line));
  const subSections = lines.filter((line) => line.length < 120 && /^(\d+\.|[A-Z][A-Za-z0-9\s&()/-]{2,})/.test(line) && !sections.includes(line));
  const tables = normalized.match(/\|[^\n]+\|/g) || [];
  const lists = lines.filter((line) => /^([-*•] |\d+\.)/.test(line));
  const definitions = lines.filter((line) => /(:|is|means)/i.test(line) && line.length < 140).slice(0, 10);
  const formulas = normalized.match(/([A-Za-z0-9\s=+\-*/()^]+={1,2}[^\n]+)/g) || [];
  const codeSnippets = normalized.match(/(```[\s\S]*?```|`[^\n`]+`)/g) || [];
  const highlights = lines.filter((line) => /important|key|note|tip/i.test(line)).slice(0, 10);

  return {
    title: fileName.replace(/\.[^/.]+$/, ''),
    overview: normalized.slice(0, 2200) || 'No text extracted.',
    sections: sections.slice(0, 8),
    subSections: subSections.slice(0, 12),
    tables: tables.slice(0, 8),
    lists: lists.slice(0, 12),
    definitions: definitions.slice(0, 10),
    formulas: formulas.slice(0, 8),
    codeSnippets: codeSnippets.slice(0, 8),
    highlights: highlights.slice(0, 8),
    extractedText: normalized,
  };
}

export function parseDocxLearningPayload(payload) {
  if (!payload || typeof payload !== 'object') {
    return {
      summary: 'No summary available.',
      beginnerLesson: 'Start with the main ideas in this document.',
      intermediateLesson: 'Connect the main ideas with examples and practical context.',
      advancedLesson: 'Interpret the document more deeply and compare concepts.',
      keyConcepts: [],
      importantDefinitions: [],
      examples: [],
      realWorldApplications: [],
      revisionNotes: [],
      cheatSheet: [],
      flashcards: [],
      quiz: [],
      mindMap: 'Central idea → supporting sections → applications',
      learningRoadmap: [],
    };
  }

  return {
    summary: payload.summary || 'No summary available.',
    beginnerLesson: payload.beginnerLesson || payload.beginner || 'Start with the basics.',
    intermediateLesson: payload.intermediateLesson || payload.intermediate || 'Explore the middle layer of concepts.',
    advancedLesson: payload.advancedLesson || payload.advanced || 'Go deeper into nuance and practice.',
    keyConcepts: Array.isArray(payload.keyConcepts) ? payload.keyConcepts : [],
    importantDefinitions: Array.isArray(payload.importantDefinitions) ? payload.importantDefinitions : [],
    examples: Array.isArray(payload.examples) ? payload.examples : [],
    realWorldApplications: Array.isArray(payload.realWorldApplications) ? payload.realWorldApplications : [],
    revisionNotes: Array.isArray(payload.revisionNotes) ? payload.revisionNotes : [],
    cheatSheet: Array.isArray(payload.cheatSheet) ? payload.cheatSheet : [],
    flashcards: Array.isArray(payload.flashcards) ? payload.flashcards : [],
    quiz: Array.isArray(payload.quiz) ? payload.quiz : [],
    mindMap: payload.mindMap || 'Central idea → supporting sections → applications',
    learningRoadmap: Array.isArray(payload.learningRoadmap) ? payload.learningRoadmap : [],
  };
}
