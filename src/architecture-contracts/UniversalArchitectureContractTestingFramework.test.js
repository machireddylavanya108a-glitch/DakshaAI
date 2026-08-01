import test from 'node:test';
import assert from 'node:assert/strict';
import { runUniversalArchitectureContractTestingFramework } from './index.js';

test('universal architecture contract testing framework validates required contracts and auto-discovers modules', async () => {
  const report = await runUniversalArchitectureContractTestingFramework();

  assert.equal(report.framework, 'UniversalArchitectureContractTestingFramework');
  assert.equal(report.schemaVersion, 'v1');
  assert.equal(report.summary.unknownFutureModuleParticipationEnabled, true);
  assert.equal(report.summary.moduleCount > 0, true);
  assert.equal(report.summary.discoveredModuleCount >= report.summary.moduleCount, true);

  const requiredComponentCoverage = report.requiredComponents.map((entry) => entry.covered);
  assert.equal(requiredComponentCoverage.every(Boolean), true);

  const failingModules = report.modules.filter((entry) => {
    const validationEntries = Object.values(entry.validations || {});
    return validationEntries.some((validation) => validation?.status === 'fail');
  });

  assert.deepEqual(failingModules, []);
  assert.equal(report.valid, true);
});

test('universal architecture contract testing framework produces diagnostics report with validation dimensions', async () => {
  const report = await runUniversalArchitectureContractTestingFramework();
  const failureKeys = Object.keys(report.diagnostics.failuresByType || {});

  assert.deepEqual(failureKeys.sort(), [
    'compatibility',
    'contract',
    'dependency',
    'lifecycle',
    'migration',
    'recovery',
    'schema',
    'serialization',
    'state'
  ]);

  assert.equal(Array.isArray(report.diagnostics.failedRequiredComponents), true);
  assert.equal(typeof report.diagnostics.generatedAt, 'string');
});
