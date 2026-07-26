export function buildYouTubeLearningModel(data = {}) {
  const transcript = Array.isArray(data?.transcript) ? data.transcript : [];
  const timestamps = Array.isArray(data?.timestamps) ? data.timestamps : [];
  const chapters = Array.isArray(data?.chapters) ? data.chapters : [];

  return {
    videoUrl: data?.videoUrl || '',
    title: data?.title || 'Untitled video',
    transcript,
    timestamps,
    chapters,
    topics: Array.isArray(data?.topics) ? data.topics : [],
    codeSnippets: Array.isArray(data?.codeSnippets) ? data.codeSnippets : [],
    formulas: Array.isArray(data?.formulas) ? data.formulas : [],
    definitions: Array.isArray(data?.definitions) ? data.definitions : [],
    importantConcepts: Array.isArray(data?.importantConcepts) ? data.importantConcepts : [],
    bookmarks: Array.isArray(data?.bookmarks) ? data.bookmarks : [],
    summary: data?.summary || '',
  };
}

export function parseYouTubeLearningPayload(payload) {
  if (!payload || typeof payload !== 'object') {
    return {
      summary: 'No summary available.',
      beginnerLesson: 'Start by understanding the main idea in the video.',
      intermediateLesson: 'Connect the key points with examples and practice.',
      advancedLesson: 'Go deeper into the concepts and compare them with broader theory.',
      keyConcepts: [],
      importantDefinitions: [],
      examples: [],
      realWorldApplications: [],
      revisionNotes: [],
      cheatSheet: [],
      flashcards: [],
      quiz: [],
      mindMap: 'Core idea → examples → application',
      learningRoadmap: [],
    };
  }

  return {
    summary: payload.summary || 'No summary available.',
    beginnerLesson: payload.beginnerLesson || payload.beginner || 'Start with the basics.',
    intermediateLesson: payload.intermediateLesson || payload.intermediate || 'Build on the main idea.',
    advancedLesson: payload.advancedLesson || payload.advanced || 'Go deeper into the concepts.',
    keyConcepts: Array.isArray(payload.keyConcepts) ? payload.keyConcepts : [],
    importantDefinitions: Array.isArray(payload.importantDefinitions) ? payload.importantDefinitions : [],
    examples: Array.isArray(payload.examples) ? payload.examples : [],
    realWorldApplications: Array.isArray(payload.realWorldApplications) ? payload.realWorldApplications : [],
    revisionNotes: Array.isArray(payload.revisionNotes) ? payload.revisionNotes : [],
    cheatSheet: Array.isArray(payload.cheatSheet) ? payload.cheatSheet : [],
    flashcards: Array.isArray(payload.flashcards) ? payload.flashcards : [],
    quiz: Array.isArray(payload.quiz) ? payload.quiz : [],
    mindMap: payload.mindMap || 'Core idea → examples → application',
    learningRoadmap: Array.isArray(payload.learningRoadmap) ? payload.learningRoadmap : [],
  };
}
