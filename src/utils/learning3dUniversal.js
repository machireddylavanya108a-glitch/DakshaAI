export function buildUniversalConceptModel(topic = 'Learning Topic') {
  const normalized = String(topic).trim();
  const tokens = normalized.split(/\s+/).filter(Boolean);
  const title = normalized || 'Learning Topic';
  const keywordList = Array.from(new Set(tokens.concat([title.toLowerCase()]))).slice(0, 8);

  const conceptMap = [
    { label: title, detail: 'Core concept' },
    { label: `${title} fundamentals`, detail: 'Foundational ideas' },
    { label: `${title} applications`, detail: 'Real-world use cases' },
    { label: `${title} examples`, detail: 'Concrete examples' },
    { label: `${title} practice`, detail: 'How to master it' }
  ];

  const visualNodes = conceptMap.map((node, index) => ({
    label: node.label,
    detail: node.detail,
    order: index
  }));

  return {
    topic: title,
    keywords: keywordList,
    visualNodes,
    explanation: {
      summary: `Explore ${title} through an adaptive concept map and AI-guided learning path.`,
      parts: ['Core idea', 'Foundations', 'Applications', 'Examples', 'Practice'],
      functions: `Explain the structure and purpose of ${title} in a clear, learner-friendly way.`,
      working: `Show how ${title} connects to related principles and real-world use cases.`,
      applications: `Apply ${title} in projects, workflows, research, or everyday problem solving.`,
      interviewQuestions: [`How would you explain ${title} simply?`, `What are the main use cases of ${title}?`],
      practiceQuestions: [`Describe ${title} in your own words.`, `Give one example of ${title} in practice.`]
    }
  };
}

export function buildUniversalLesson(topic = 'Learning Topic') {
  const concept = buildUniversalConceptModel(topic);
  return {
    title: concept.topic,
    summary: concept.explanation.summary,
    sections: [
      { heading: 'What is it?', body: concept.explanation.summary },
      { heading: 'How it works', body: concept.explanation.working },
      { heading: 'Real-world applications', body: concept.explanation.applications },
      { heading: 'Practice', body: concept.explanation.practiceQuestions.join(' ') }
    ],
    conceptMap: concept.visualNodes,
    keywords: concept.keywords
  };
}
