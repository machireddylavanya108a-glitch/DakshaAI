export function buildPptLearningModel(data = {}) {
  const slides = Array.isArray(data?.slides) ? data.slides : [];
  const normalizedSlides = slides.map((slide, index) => ({
    id: slide?.id || `slide-${index + 1}`,
    title: slide?.title || `Slide ${index + 1}`,
    text: Array.isArray(slide?.text) ? slide.text : [],
    bullets: Array.isArray(slide?.bullets) ? slide.bullets : [],
    tables: Array.isArray(slide?.tables) ? slide.tables : [],
    charts: Array.isArray(slide?.charts) ? slide.charts : [],
    diagrams: Array.isArray(slide?.diagrams) ? slide.diagrams : [],
    images: Array.isArray(slide?.images) ? slide.images : [],
    notes: Array.isArray(slide?.notes) ? slide.notes : [],
  }));

  return {
    title: data?.title || 'Untitled Presentation',
    overview: data?.overview || '',
    slides: normalizedSlides,
    notes: Array.isArray(data?.notes) ? data.notes : [],
    charts: Array.isArray(data?.charts) ? data.charts : [],
    images: Array.isArray(data?.images) ? data.images : [],
    tables: Array.isArray(data?.tables) ? data.tables : [],
    diagrams: Array.isArray(data?.diagrams) ? data.diagrams : [],
    bookmarks: Array.isArray(data?.bookmarks) ? data.bookmarks : [],
    extractedText: slides.map((slide) => [slide?.title, ...(slide?.text || []), ...(slide?.bullets || [])].filter(Boolean).join('\n')).join('\n\n')
  };
}

export function parsePptLearningPayload(payload) {
  if (!payload || typeof payload !== 'object') {
    return {
      summary: 'No summary available.',
      beginnerLesson: 'Start by understanding the main storyline of the presentation.',
      intermediateLesson: 'Connect the key ideas with examples and practical context.',
      advancedLesson: 'Go deeper into the concepts and compare them with real-world strategies.',
      keyConcepts: [],
      importantDefinitions: [],
      examples: [],
      realWorldApplications: [],
      revisionNotes: [],
      cheatSheet: [],
      flashcards: [],
      quiz: [],
      mindMap: 'Core idea → supporting sections → applications',
      learningRoadmap: []
    };
  }

  return {
    summary: payload.summary || 'No summary available.',
    beginnerLesson: payload.beginnerLesson || payload.beginner || 'Start with the basics.',
    intermediateLesson: payload.intermediateLesson || payload.intermediate || 'Explore the middle layer of concepts.',
    advancedLesson: payload.advancedLesson || payload.advanced || 'Go deeper into the subject.',
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
