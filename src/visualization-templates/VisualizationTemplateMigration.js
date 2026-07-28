import { VISUALIZATION_TEMPLATE_LATEST_VERSION } from './VisualizationTemplateConfig.js';
import { normalizeVisualizationTemplate } from './VisualizationTemplateNormalizer.js';

const migrations = [];

function normalizeVersion(version) {
  const text = String(version || '').trim().toLowerCase();
  if (!text) return 'v0';
  if (text.startsWith('v')) return text;
  if (/^\d+$/.test(text)) return `v${text}`;
  return 'v0';
}

function migrateLegacyToV1(template = {}) {
  const normalized = normalizeVisualizationTemplate({
    ...template,
    version: 'v1'
  });

  return {
    template: normalized,
    migrationNotes: ['Migrated template to v1 canonical schema.'],
    migrated: true
  };
}

export function registerTemplateMigration(migration) {
  if (!migration || typeof migration !== 'object') return false;
  if (!migration.fromVersion || !migration.toVersion || typeof migration.migrate !== 'function') return false;
  migrations.push(migration);
  return true;
}

export function listTemplateMigrations() {
  return [...migrations];
}

export function getLatestTemplateVersion() {
  return VISUALIZATION_TEMPLATE_LATEST_VERSION;
}

export function isTemplateMigrationRequired(template = {}) {
  const current = normalizeVersion(template.version);
  return current !== normalizeVersion(VISUALIZATION_TEMPLATE_LATEST_VERSION);
}

export function migrateVisualizationTemplate(template = {}, targetVersion = VISUALIZATION_TEMPLATE_LATEST_VERSION) {
  const requested = normalizeVersion(targetVersion);
  const current = normalizeVersion(template.version);

  if (current === requested) {
    return {
      template: normalizeVisualizationTemplate({ ...template, version: requested }),
      migrated: false,
      migrationCount: 0,
      migrationNotes: []
    };
  }

  let working = { ...template };
  const notes = [];
  let count = 0;

  if (current === 'v0' && requested === 'v1') {
    const migrated = migrateLegacyToV1(working);
    working = migrated.template;
    notes.push(...migrated.migrationNotes);
    count += 1;
  }

  for (const migration of migrations) {
    if (normalizeVersion(migration.fromVersion) === normalizeVersion(working.version)
      && normalizeVersion(migration.toVersion) === requested) {
      working = migration.migrate(working);
      notes.push(`Applied custom migration ${migration.fromVersion} -> ${migration.toVersion}.`);
      count += 1;
    }
  }

  if (normalizeVersion(working.version) !== requested) {
    working = normalizeVisualizationTemplate({ ...working, version: requested });
    notes.push('Applied forward-safe version normalization.');
    count += 1;
  }

  return {
    template: working,
    migrated: count > 0,
    migrationCount: count,
    migrationNotes: notes
  };
}
