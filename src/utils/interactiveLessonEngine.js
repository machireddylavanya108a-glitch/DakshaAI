function normalizeLine(line = '') {
  return String(line || '').trim();
}

export function buildInteractiveLessonPrompt({ topic, question, snapshot, conversation = [], language = 'English', preferredStyle = 'balanced' }) {
  const prior = conversation.length ? conversation.slice(-3).map((item) => `Q: ${item.question}\nA: ${item.answer}`).join('\n\n') : 'No prior interruption yet.';
  const snapshotState = snapshot ? JSON.stringify(snapshot).slice(0, 2000) : 'No saved state.';

  return [
    'You are the interactive lesson engine for a live AI tutor.',
    `Lesson topic: ${topic || 'Current lesson'}`,
    `Learner question: ${question || 'Explain the current step.'}`,
    `Language: ${language}`,
    `Preferred style: ${preferredStyle}`,
    `Current lesson state: ${snapshotState}`,
    `Prior interruptions: ${prior}`,
    'Answer using these sections in order:',
    'Voice: a short spoken explanation for the learner.',
    '3D: a concise 3D scene cue or object focus.',
    'Diagram: a simple diagram explanation or structural note.',
    'Animation: a brief animation cue or motion guidance.',
    'Whiteboard: a quick board-style summary or reasoning step.',
    'Example: one concrete example.',
    'Resume: explain that the lesson will continue from the previous point with context preserved.'
  ].join('\n');
}

export function parseInteractiveLessonResponse(text = '') {
  const lines = String(text || '').split(/\n/).map(normalizeLine).filter(Boolean);
  const sections = {
    voice: '',
    threeD: '',
    diagram: '',
    animation: '',
    whiteboard: '',
    example: '',
    resume: ''
  };

  let current = null;
  for (const line of lines) {
    if (/^Voice:/i.test(line)) {
      current = 'voice';
      sections.voice = line.replace(/^Voice:\s*/i, '');
      continue;
    }
    if (/^3D:/i.test(line)) {
      current = 'threeD';
      sections.threeD = line.replace(/^3D:\s*/i, '');
      continue;
    }
    if (/^Diagram:/i.test(line)) {
      current = 'diagram';
      sections.diagram = line.replace(/^Diagram:\s*/i, '');
      continue;
    }
    if (/^Animation:/i.test(line)) {
      current = 'animation';
      sections.animation = line.replace(/^Animation:\s*/i, '');
      continue;
    }
    if (/^Whiteboard:/i.test(line)) {
      current = 'whiteboard';
      sections.whiteboard = line.replace(/^Whiteboard:\s*/i, '');
      continue;
    }
    if (/^Example:/i.test(line)) {
      current = 'example';
      sections.example = line.replace(/^Example:\s*/i, '');
      continue;
    }
    if (/^Resume:/i.test(line)) {
      current = 'resume';
      sections.resume = line.replace(/^Resume:\s*/i, '');
      continue;
    }

    if (current) sections[current] = `${sections[current]} ${line}`.trim();
  }

  return sections;
}
