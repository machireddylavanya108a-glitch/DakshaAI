import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createAiConfig,
  DEFAULT_OPENROUTER_BASE_URL,
  DEFAULT_OPENROUTER_TEXT_MODEL,
  DEFAULT_OPENROUTER_VISION_MODEL
} from './aiConfig.js';

test('safe AI model defaults are applied when model env vars are missing', () => {
  const config = createAiConfig({
    VITE_OPENROUTER_API_KEY: 'key-present',
    VITE_OPENROUTER_TEXT_MODEL: '',
    VITE_OPENROUTER_VISION_MODEL: ''
  });

  assert.equal(config.textModel, DEFAULT_OPENROUTER_TEXT_MODEL);
  assert.equal(config.visionModel, DEFAULT_OPENROUTER_VISION_MODEL);
  assert.equal(config.baseUrl, DEFAULT_OPENROUTER_BASE_URL);
});

test('missing API key disables OpenRouter without invalidating model defaults', () => {
  const config = createAiConfig({
    VITE_OPENROUTER_API_KEY: '',
    VITE_OPENROUTER_TEXT_MODEL: 'openai/gpt-4.1-mini',
    VITE_OPENROUTER_VISION_MODEL: 'openai/gpt-4.1-mini'
  });

  assert.equal(config.apiKey, '');
  assert.equal(config.textModel, 'openai/gpt-4.1-mini');
  assert.equal(config.visionModel, 'openai/gpt-4.1-mini');
});
