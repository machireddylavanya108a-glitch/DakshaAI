import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPptLearningModel, parsePptLearningPayload } from './pptLearningUtils.js';

test('buildPptLearningModel extracts slide information', () => {
  const model = buildPptLearningModel({
    title: 'Quarterly Strategy',
    slides: [
      { title: 'Overview', text: ['Revenue growth', 'Market expansion'], bullets: ['Revenue growth', 'Market expansion'] },
      { title: 'Risks', text: ['Supply chain'], bullets: ['Supply chain'] }
    ],
    notes: ['Presented by team'],
    charts: [{ title: 'Revenue', type: 'bar' }],
    images: [{ alt: 'diagram' }],
    tables: [{ title: 'Plan' }],
    diagrams: [{ title: 'Workflow' }],
  });

  assert.equal(model.title, 'Quarterly Strategy');
  assert.equal(model.slides.length, 2);
  assert.equal(model.slides[0].title, 'Overview');
  assert.equal(model.charts.length, 1);
  assert.equal(model.images.length, 1);
});

test('parsePptLearningPayload normalizes AI payload', () => {
  const payload = parsePptLearningPayload({
    summary: 'High level summary',
    beginnerLesson: 'Start here',
    intermediateLesson: 'Build on it',
    advancedLesson: 'Go deeper',
    keyConcepts: ['Growth'],
    importantDefinitions: ['Revenue'],
    examples: ['Example one'],
    realWorldApplications: ['Use it in business'],
    revisionNotes: ['Review weekly'],
    cheatSheet: ['Keep it short'],
    flashcards: [{ front: 'What?', back: 'Answer' }],
    quiz: [{ question: 'Why?', options: ['A', 'B', 'C', 'D'], answer: 'A' }],
    mindMap: 'Core -> Theme',
    learningRoadmap: ['Day 1']
  });

  assert.equal(payload.summary, 'High level summary');
  assert.equal(payload.keyConcepts[0], 'Growth');
  assert.equal(payload.flashcards.length, 1);
  assert.equal(payload.quiz[0].answer, 'A');
});
