export function normalizeCameraLearningPayload(payload = {}, imageName = 'camera-image') {
  const lesson = payload.lesson || {};
  const analysis = payload.analysis || {};
  const detectedElements = analysis.detectedElements || payload.detectedElements || {};

  return {
    imageName,
    ocrText: payload.ocrText || payload.extractedText || '',
    analysis: {
      summary: payload.summary || analysis.summary || '',
      detectedElements: {
        headings: detectedElements.headings || [],
        paragraphs: detectedElements.paragraphs || [],
        tables: detectedElements.tables || [],
        handwrittenText: detectedElements.handwrittenText || [],
        formulas: detectedElements.formulas || [],
        diagrams: detectedElements.diagrams || [],
        codeSnippets: detectedElements.codeSnippets || [],
        concepts: detectedElements.concepts || []
      },
      keyConcepts: analysis.keyConcepts || payload.keyConcepts || [],
      definitions: analysis.definitions || payload.definitions || [],
      formulas: analysis.formulas || payload.formulas || [],
      diagrams: analysis.diagrams || payload.diagrams || [],
      qualityWarnings: analysis.qualityWarnings || payload.qualityWarnings || []
    },
    lesson: {
      title: payload.title || lesson.title || `Learning from ${imageName}`,
      summary: payload.summary || lesson.summary || '',
      beginnerLesson: payload.beginnerLesson || lesson.beginnerLesson || '',
      intermediateLesson: payload.intermediateLesson || lesson.intermediateLesson || '',
      advancedLesson: payload.advancedLesson || lesson.advancedLesson || '',
      keyConcepts: payload.keyConcepts || lesson.keyConcepts || [],
      importantDefinitions: payload.importantDefinitions || lesson.importantDefinitions || [],
      examples: payload.examples || lesson.examples || [],
      realWorldApplications: payload.realWorldApplications || lesson.realWorldApplications || [],
      revisionNotes: payload.revisionNotes || lesson.revisionNotes || [],
      cheatSheet: payload.cheatSheet || lesson.cheatSheet || [],
      flashcards: payload.flashcards || lesson.flashcards || [],
      quiz: payload.quiz || lesson.quiz || [],
      mindMap: payload.mindMap || lesson.mindMap || '',
      learningRoadmap: payload.learningRoadmap || lesson.learningRoadmap || [],
      headings: payload.headings || lesson.headings || [],
      paragraphs: payload.paragraphs || lesson.paragraphs || [],
      tables: payload.tables || lesson.tables || [],
      handwrittenText: payload.handwrittenText || lesson.handwrittenText || [],
      codeSnippets: payload.codeSnippets || lesson.codeSnippets || []
    }
  };
}
