import test from 'node:test';
import assert from 'node:assert/strict';
import { buildIntegrationCatalog, createAutomationTemplate, validateOAuthConfig } from './integrationHelpers.js';

test('buildIntegrationCatalog includes support for core categories and providers', () => {
  const catalog = buildIntegrationCatalog();
  assert.ok(catalog.length >= 5);
  const names = catalog.flatMap((section) => section.integrations.map((integration) => integration.name));
  assert.ok(names.includes('Google Workspace'));
  assert.ok(names.includes('Slack'));
  assert.ok(names.includes('GitHub'));
  assert.ok(names.includes('OpenAI'));
});

test('createAutomationTemplate returns a valid workflow scaffold', () => {
  const template = createAutomationTemplate('Lead sync');
  assert.equal(template.name, 'Lead sync');
  assert.equal(template.trigger.type, 'webhook');
  assert.equal(template.actions.length, 2);
  assert.equal(template.conditions.length, 1);
});

test('validateOAuthConfig accepts known providers and rejects unknown ones', () => {
  assert.equal(validateOAuthConfig('google'), true);
  assert.equal(validateOAuthConfig('microsoft'), true);
  assert.equal(validateOAuthConfig('unknown-provider'), false);
});
