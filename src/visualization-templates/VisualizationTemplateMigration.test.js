import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isTemplateMigrationRequired,
  migrateVisualizationTemplate,
  getLatestTemplateVersion,
  registerTemplateMigration,
  listTemplateMigrations,
  processVisualizationTemplate
} from './index.js';

test('template migration from legacy version to latest version', () => {
  const legacy = { version: 'v0', template_id: 'tmpl-legacy', semantic_purpose: 'legacy-purpose' };
  const migrated = migrateVisualizationTemplate(legacy, getLatestTemplateVersion());

  assert.equal(migrated.migrated, true);
  assert.equal(migrated.template.version, getLatestTemplateVersion());
  assert.equal(migrated.template.semanticPurpose, 'legacy-purpose');
});

test('isTemplateMigrationRequired detects version differences', () => {
  assert.equal(isTemplateMigrationRequired({ version: 'v0' }), true);
  assert.equal(isTemplateMigrationRequired({ version: getLatestTemplateVersion() }), false);
});

test('register and list custom migrations', () => {
  const ok = registerTemplateMigration({
    fromVersion: 'v1',
    toVersion: 'v2',
    migrate: (template) => ({ ...template, version: 'v2', metadata: { ...(template.metadata || {}), migratedCustom: true } })
  });
  assert.equal(ok, true);
  assert.equal(listTemplateMigrations().length >= 1, true);
});

test('migration preserves unknown semantic purpose and extensions', () => {
  const migrated = migrateVisualizationTemplate({
    version: 'v0',
    semanticPurpose: 'future-semantic-purpose',
    extensions: { unknownProperty: { x: 1 } }
  });

  assert.equal(migrated.template.semanticPurpose, 'future-semantic-purpose');
  assert.equal(migrated.template.extensions.unknownProperty.x, 1);
});

test('old templates in processing pipeline remain compatible', () => {
  const processed = processVisualizationTemplate({
    template_version: '0',
    template_id: 'tmpl-old-cache',
    sceneTemplate: {
      semantic_purpose: 'cached-legacy-purpose'
    }
  });

  assert.equal(processed.valid, true);
  assert.equal(processed.template.version.length > 0, true);
});
