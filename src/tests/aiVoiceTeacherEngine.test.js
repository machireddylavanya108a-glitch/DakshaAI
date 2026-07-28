import test from 'node:test';
import assert from 'node:assert/strict';
import { buildVoiceTeachingPrompt, buildVoiceTeachingProfile } from '../utils/aiVoiceTeacherEngine.js';

test('buildVoiceTeachingPrompt adapts to level and language', () => {
  const prompt = buildVoiceTeachingPrompt('Explain photosynthesis for a beginner in Telugu', 'Telugu', 'friendly');
  assert.match(prompt, /beginner/);
  assert.match(prompt, /Telugu/);
  assert.match(prompt, /storytelling/i);
});

test('buildVoiceTeachingProfile detects mixed-language intent', () => {
  const profile = buildVoiceTeachingProfile('Explain calculus in English and Hindi', 'English', 'college');
  assert.equal(profile.level, 'intermediate');
  assert.deepEqual(profile.mixedLanguage, ['Hindi']);
  assert.equal(profile.voiceStyle, 'warm-professor');
});
