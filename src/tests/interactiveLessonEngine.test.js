import test from 'node:test';
import assert from 'node:assert/strict';
import { buildInteractiveLessonPrompt, parseInteractiveLessonResponse } from '../utils/interactiveLessonEngine.js';

test('buildInteractiveLessonPrompt includes lesson context and teaching modes', () => {
  const prompt = buildInteractiveLessonPrompt({
    topic: 'Photosynthesis',
    question: 'Why does it happen?',
    snapshot: { currentTopic: 'Photosynthesis', currentStepIndex: 2 },
    conversation: [{ question: 'What is it?', answer: 'It is a process.' }],
    language: 'English',
    preferredStyle: 'simple'
  });

  assert.match(prompt, /Photosynthesis/);
  assert.match(prompt, /Voice:/i);
  assert.match(prompt, /3D:/i);
  assert.match(prompt, /Whiteboard:/i);
  assert.match(prompt, /Resume:/i);
});

test('parseInteractiveLessonResponse extracts multi-mode guidance', () => {
  const parsed = parseInteractiveLessonResponse(`Voice: Explain the idea slowly.\n3D: Show the chloroplast.\nDiagram: Draw the light phase.\nAnimation: Pulse the energy transfer.\nWhiteboard: Write the inputs and outputs.\nExample: Compare it to a solar panel.\nResume: Continue from the previous step.`);

  assert.equal(parsed.voice, 'Explain the idea slowly.');
  assert.equal(parsed.threeD, 'Show the chloroplast.');
  assert.equal(parsed.diagram, 'Draw the light phase.');
  assert.equal(parsed.animation, 'Pulse the energy transfer.');
  assert.equal(parsed.whiteboard, 'Write the inputs and outputs.');
  assert.equal(parsed.example, 'Compare it to a solar panel.');
  assert.match(parsed.resume, /Continue/);
});
