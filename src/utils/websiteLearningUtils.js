export function buildWebsiteLearningModel(data = {}) {
  const cleanedContent = data?.content || '';
  const headings = Array.isArray(data?.headings) ? data.headings : [];
  const subheadings = Array.isArray(data?.subheadings) ? data.subheadings : [];
  const codeBlocks = Array.isArray(data?.codeBlocks) ? data.codeBlocks : [];
  const tables = Array.isArray(data?.tables) ? data.tables : [];
  const images = Array.isArray(data?.images) ? data.images : [];
  const formulas = Array.isArray(data?.formulas) ? data.formulas : [];
  const concepts = Array.isArray(data?.concepts) ? data.concepts : [];

  return {
    url: data?.url || '',
    title: data?.title || 'Untitled webpage',
    content: cleanedContent,
    headings,
    subheadings,
    codeBlocks,
    tables,
    images,
    formulas,
    concepts,
    bookmarks: Array.isArray(data?.bookmarks) ? data.bookmarks : [],
  };
}

export function parseWebsiteLearningPayload(payload) {
  if (!payload || typeof payload !== 'object') {
    return {
      summary: 'No summary available.',
      beginnerLesson: 'Start by understanding the main purpose of this page.',
      intermediateLesson: 'Connect the main ideas with examples and practical context.',
      advancedLesson: 'Go deeper into the concepts and evaluate how the ideas fit together.',
      keyConcepts: [],
      importantDefinitions: [],
      examples: [],
      realWorldApplications: [],
      revisionNotes: [],
      cheatSheet: [],
      flashcards: [],
      quiz: [],
      mindMap: 'Core idea → supporting sections → applications',
      learningRoadmap: [],
    };
  }

  return {
    summary: payload.summary || 'No summary available.',
    beginnerLesson: payload.beginnerLesson || payload.beginner || 'Start with the essentials.',
    intermediateLesson: payload.intermediateLesson || payload.intermediate || 'Build on the main idea.',
    advancedLesson: payload.advancedLesson || payload.advanced || 'Go deeper and evaluate the concepts.',
    keyConcepts: Array.isArray(payload.keyConcepts) ? payload.keyConcepts : [],
    importantDefinitions: Array.isArray(payload.importantDefinitions) ? payload.importantDefinitions : [],
    examples: Array.isArray(payload.examples) ? payload.examples : [],
    realWorldApplications: Array.isArray(payload.realWorldApplications) ? payload.realWorldApplications : [],
    revisionNotes: Array.isArray(payload.revisionNotes) ? payload.revisionNotes : [],
    cheatSheet: Array.isArray(payload.cheatSheet) ? payload.cheatSheet : [],
    flashcards: Array.isArray(payload.flashcards) ? payload.flashcards : [],
    quiz: Array.isArray(payload.quiz) ? payload.quiz : [],
    mindMap: payload.mindMap || 'Core idea → supporting sections → applications',
    learningRoadmap: Array.isArray(payload.learningRoadmap) ? payload.learningRoadmap : [],
  };
}
