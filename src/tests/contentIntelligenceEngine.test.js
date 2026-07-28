import test from 'node:test';
import assert from 'node:assert/strict';
import { buildContentIntelligenceProfile } from '../utils/contentIntelligenceEngine.js';

test('buildContentIntelligenceProfile extracts structured lesson metadata from content', () => {
  const profile = buildContentIntelligenceProfile({
    sourceText: 'Photosynthesis is the process plants use to convert sunlight into energy. It involves chlorophyll, glucose, and carbon dioxide. This lesson covers light reactions, the Calvin cycle, and plant cells.',
    sourceName: 'Biology Notes',
    sourceType: 'text',
    visionSummary: 'A biology lesson about photosynthesis with diagrams and plant cells.'
  });

  assert.equal(profile.title, 'Photosynthesis: Energy Conversion in Plants');
  assert.equal(profile.subject, 'Biology');
  assert.ok(profile.chapters.length >= 2);
  assert.ok(profile.topics.includes('Photosynthesis'));
  assert.ok(profile.learningObjectives.length >= 2);
  assert.ok(profile.keyConcepts.includes('Chlorophyll'));
  assert.ok(profile.entities.includes('Plants'));
  assert.ok(profile.relationships.length >= 1);
});

test('buildContentIntelligenceProfile uses a follow-up prompt when content is too weak', () => {
  const profile = buildContentIntelligenceProfile({
    sourceText: '',
    sourceName: 'Screenshot (35).png',
    sourceType: 'image',
    visionSummary: 'I could not confidently identify the image content.'
  });

  assert.equal(profile.followUpPrompt, "I couldn't fully understand this file. Can you tell me what this is?");
});
