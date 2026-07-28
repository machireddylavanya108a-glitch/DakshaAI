import test from 'node:test';
import assert from 'node:assert/strict';
import { getCoreLearningModules } from './missionHelpers.js';

test('getCoreLearningModules keeps mission-focused features and excludes marketplace-style features', () => {
  const modules = getCoreLearningModules();
  const names = modules.map((module) => module.name);

  assert.ok(names.includes('Universal Scanner'));
  assert.ok(names.includes('AI Teacher'));
  assert.ok(names.includes('AI Tutor'));
  assert.ok(!names.includes('Plugin Marketplace'));
  assert.ok(!names.includes('App Marketplace'));
});
