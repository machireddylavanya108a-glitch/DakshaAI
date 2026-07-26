import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateFlashcardProgress, parseFlashcardPayload } from '../src/utils/flashcardUtils.js';

test('calculateFlashcardProgress counts learned cards and study time', () => {
  const progress = calculateFlashcardProgress([
    { status: 'known' },
    { status: 'review' },
    { status: 'known' },
  ], 180);

  assert.equal(progress.cardsLearned, 2);
  assert.equal(progress.cardsRemaining, 1);
  assert.equal(progress.accuracy, 66.67);
  assert.equal(progress.completionPercentage, 66.67);
  assert.equal(progress.studyTime, '3:00');
});

test('parseFlashcardPayload normalizes generated flashcard data', () => {
  const deck = parseFlashcardPayload({
    title: 'AI Basics',
    category: 'Technology',
    flashcards: [{ front: 'What is AI?', back: 'Artificial intelligence', difficulty: 'Beginner', tags: ['ai', 'basics'] }],
  });

  assert.equal(deck.title, 'AI Basics');
  assert.equal(deck.category, 'Technology');
  assert.equal(deck.flashcards.length, 1);
  assert.equal(deck.flashcards[0].difficulty, 'Beginner');
});
