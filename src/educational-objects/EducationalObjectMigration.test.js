import test from 'node:test';
import assert from 'node:assert/strict';
import {
  migrateEducationalObject,
  registerEducationalObjectMigration,
  listEducationalObjectMigrations,
  isEducationalObjectMigrationRequired
} from './index.js';

test('migration requirement detection normalizes versions', () => {
  assert.equal(isEducationalObjectMigrationRequired({ version: 1 }, 'v1'), false);
  assert.equal(isEducationalObjectMigrationRequired({ version: 'v0' }, 'v1'), true);
});

test('custom migration registration is applied', () => {
  registerEducationalObjectMigration('v0', 'v1', (object) => ({
    ...object,
    semanticRole: 'migrated-role',
    metadata: {
      ...(object.metadata || {}),
      migratedWith: 'custom'
    }
  }));

  const migrated = migrateEducationalObject({ version: 'v0', objectId: 'obj-0' }, 'v1');
  assert.equal(migrated.migrated, true);
  assert.equal(migrated.object.version, 'v1');
  assert.equal(migrated.object.semanticRole, 'migrated-role');
  assert.equal(listEducationalObjectMigrations().includes('v0->v1'), true);
});
