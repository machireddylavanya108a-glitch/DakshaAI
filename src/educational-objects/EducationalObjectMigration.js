import { EDUCATIONAL_OBJECT_LATEST_VERSION } from './EducationalObjectConfig.js';

const migrations = new Map();

function normalizeVersion(version = '') {
  const normalized = String(version || '').trim().toLowerCase();
  if (!normalized) return 'v1';
  if (normalized.startsWith('v')) return normalized;
  if (/^\d+$/.test(normalized)) return `v${normalized}`;
  return 'v1';
}

export function getLatestEducationalObjectVersion() {
  return EDUCATIONAL_OBJECT_LATEST_VERSION;
}

export function isEducationalObjectMigrationRequired(object = {}, targetVersion = EDUCATIONAL_OBJECT_LATEST_VERSION) {
  const current = normalizeVersion(object?.version || 'v1');
  const target = normalizeVersion(targetVersion);
  return current !== target;
}

export function registerEducationalObjectMigration(fromVersion, toVersion, migrator) {
  const from = normalizeVersion(fromVersion);
  const to = normalizeVersion(toVersion);
  if (typeof migrator !== 'function') return false;
  migrations.set(`${from}->${to}`, migrator);
  return true;
}

export function listEducationalObjectMigrations() {
  return [...migrations.keys()];
}

function migrateV1ToV1(object = {}) {
  return {
    ...object,
    version: 'v1',
    kind: object.kind || object.type || object.objectType || 'generic-educational-object',
    semanticRole: object.semanticRole || object.semantic_role || 'adaptive-role',
    learningPurpose: object.learningPurpose || object.learning_purpose || 'inspect',
    metadata: {
      ...(object.metadata || {}),
      migrationVersion: 'v1'
    }
  };
}

export function migrateEducationalObject(object = {}, targetVersion = EDUCATIONAL_OBJECT_LATEST_VERSION) {
  const current = normalizeVersion(object?.version || 'v1');
  const target = normalizeVersion(targetVersion);
  if (current === target) {
    return {
      migrated: false,
      migrationCount: 0,
      migrationNotes: [],
      object: {
        ...object,
        version: target
      }
    };
  }

  const key = `${current}->${target}`;
  const custom = migrations.get(key);
  if (custom) {
    const migrated = custom(object);
    return {
      migrated: true,
      migrationCount: 1,
      migrationNotes: [`migrated-via-custom:${key}`],
      object: {
        ...(migrated || object),
        version: target
      }
    };
  }

  const migrated = migrateV1ToV1(object);
  return {
    migrated: true,
    migrationCount: 1,
    migrationNotes: [`migrated:${current}->${target}`],
    object: {
      ...migrated,
      version: target
    }
  };
}
