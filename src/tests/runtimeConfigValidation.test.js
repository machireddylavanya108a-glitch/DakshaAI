import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_OPENROUTER_TEXT_MODEL,
  DEFAULT_OPENROUTER_VISION_MODEL,
  resetRuntimeConfigWarningState,
  validateRuntimeConfig
} from '../utils/runtimeConfigValidation.js';

function createLogger() {
  return {
    warnMessages: [],
    errorMessages: [],
    warn(message) {
      this.warnMessages.push(String(message));
    },
    error(message) {
      this.errorMessages.push(String(message));
    }
  };
}

const baseEnv = {
  VITE_FIREBASE_API_KEY: 'firebase-key',
  VITE_FIREBASE_AUTH_DOMAIN: 'example.firebaseapp.com',
  VITE_FIREBASE_PROJECT_ID: 'project-id',
  VITE_FIREBASE_APP_ID: 'firebase-app-id',
  VITE_OPENROUTER_API_KEY: 'openrouter-key',
  VITE_OPENROUTER_TEXT_MODEL: 'openai/gpt-4.1-mini',
  VITE_OPENROUTER_VISION_MODEL: 'openai/gpt-4.1-mini'
};

test('missing Firebase config warns Firebase auth risk only', () => {
  resetRuntimeConfigWarningState();
  const logger = createLogger();

  const report = validateRuntimeConfig({
    ...baseEnv,
    VITE_FIREBASE_API_KEY: '',
    VITE_FIREBASE_AUTH_DOMAIN: ''
  }, logger);

  assert.equal(report.firebase.valid, false);
  assert.ok(report.firebase.missing.includes('VITE_FIREBASE_API_KEY'));
  assert.ok(report.firebase.missing.includes('VITE_FIREBASE_AUTH_DOMAIN'));
  assert.ok(logger.warnMessages.some((message) => message.includes('[Firebase] Missing runtime config values')));
  assert.ok(logger.errorMessages.some((message) => message.includes('[Firebase] Authentication may fail')));
});

test('missing OpenRouter model config uses defaults without disabling AI when API key exists', () => {
  resetRuntimeConfigWarningState();
  const logger = createLogger();

  const report = validateRuntimeConfig({
    ...baseEnv,
    VITE_OPENROUTER_TEXT_MODEL: '',
    VITE_OPENROUTER_VISION_MODEL: ''
  }, logger);

  assert.equal(report.firebase.valid, true);
  assert.equal(report.openRouter.complete, true);
  assert.equal(report.openRouter.missing.length, 0);
  assert.equal(report.openRouter.aiGenerationEnabled, true);
  assert.equal(report.openRouter.textModel, DEFAULT_OPENROUTER_TEXT_MODEL);
  assert.equal(report.openRouter.visionModel, DEFAULT_OPENROUTER_VISION_MODEL);
  assert.equal(logger.warnMessages.length, 0);
  assert.equal(logger.errorMessages.length, 0);
});

test('missing OpenRouter API key disables AI generation only', () => {
  resetRuntimeConfigWarningState();
  const logger = createLogger();

  const report = validateRuntimeConfig({
    ...baseEnv,
    VITE_OPENROUTER_API_KEY: ''
  }, logger);

  assert.equal(report.firebase.valid, true);
  assert.equal(report.openRouter.complete, false);
  assert.ok(report.openRouter.missing.includes('VITE_OPENROUTER_API_KEY'));
  assert.equal(report.openRouter.aiGenerationEnabled, false);
  assert.ok(logger.warnMessages.some((message) => message.includes('VITE_OPENROUTER_API_KEY')));
});

test('valid full config passes without warnings', () => {
  resetRuntimeConfigWarningState();
  const logger = createLogger();

  const report = validateRuntimeConfig({ ...baseEnv }, logger);

  assert.equal(report.valid, true);
  assert.equal(report.firebase.valid, true);
  assert.equal(report.openRouter.complete, true);
  assert.equal(logger.warnMessages.length, 0);
  assert.equal(logger.errorMessages.length, 0);
});

test('default model fallback resolves to openai/gpt-4.1-mini', () => {
  resetRuntimeConfigWarningState();
  const logger = createLogger();

  const report = validateRuntimeConfig({
    ...baseEnv,
    VITE_OPENROUTER_TEXT_MODEL: '',
    VITE_OPENROUTER_VISION_MODEL: ''
  }, logger);

  assert.equal(report.openRouter.textModel, DEFAULT_OPENROUTER_TEXT_MODEL);
  assert.equal(report.openRouter.visionModel, DEFAULT_OPENROUTER_VISION_MODEL);
});
