import path from 'node:path';
import { promises as fs } from 'node:fs';
import { pathToFileURL } from 'node:url';

const MODULE_NAME_PATTERN = /(Engine|Runtime|Pipeline|Builder|Validator|Schema|Serializer|Deserializer|Migration|Normalizer|Repair|Integrity|VersionManager|Adapter|Manager|Registry|Contract|Synchronization|Graph)\.js$/i;

const ARCHITECTURE_ROOTS = [
  'services',
  'intent-analysis',
  'visualization-strategy',
  'recommendation',
  'scene-generator',
  'scene-builder',
  'timeline',
  'renderer-core',
  'interactions',
  'asset-discovery',
  'utils'
];

const EXCLUDED_SEGMENTS = new Set([
  'components',
  'pages',
  'layouts',
  'styles',
  'assets',
  'tests'
]);

const REQUIRED_COMPONENT_RULES = [
  {
    component: 'Universal Learning Pipeline',
    matcher: (relativePath) => /services\/universalLearningPipeline\.js$/i.test(relativePath)
  },
  {
    component: 'Learning Intent Engine',
    matcher: (relativePath) => /intent-analysis\/.+Engine\.js$/i.test(relativePath) || /intent-analysis\/index\.js$/i.test(relativePath)
  },
  {
    component: 'Visualization Strategy Engine',
    matcher: (relativePath) => /visualization-strategy\/.+Engine\.js$/i.test(relativePath) || /visualization-strategy\/index\.js$/i.test(relativePath)
  },
  {
    component: 'Template Recommendation Engine',
    matcher: (relativePath) => /recommendation\/.+Engine\.js$/i.test(relativePath) || /recommendation\/index\.js$/i.test(relativePath)
  },
  {
    component: 'Scene Generator',
    matcher: (relativePath) => /scene-generator\/SceneGenerationPipeline\.js$/i.test(relativePath) || /scene-generator\/index\.js$/i.test(relativePath)
  },
  {
    component: 'Scene Validation Pipeline',
    matcher: (relativePath) => /scene-generator\/Scene(Validator|Schema|VersionManager|Repair|Migration|Normalizer)\.js$/i.test(relativePath)
  },
  {
    component: 'Scene Builder',
    matcher: (relativePath) => /scene-builder\/SceneBuilder\.js$/i.test(relativePath) || /scene-builder\/SceneRuntime\.js$/i.test(relativePath)
  },
  {
    component: 'Runtime Graph',
    matcher: (relativePath) => /renderer-core\/UniversalRuntimeGraphAdapter\.js$/i.test(relativePath) || /scene-builder\/SceneGraph\.js$/i.test(relativePath)
  },
  {
    component: 'Timeline Engine',
    matcher: (relativePath) => /timeline\/index\.js$/i.test(relativePath) || /timeline\/runtime\/.+\.js$/i.test(relativePath)
  },
  {
    component: 'AI Teacher Synchronization',
    matcher: (relativePath) => /utils\/teacherSynchronizationEngine\.js$/i.test(relativePath) || /timeline\/runtime\/TimelineSynchronizationRuntime\.js$/i.test(relativePath)
  },
  {
    component: 'Interaction Engine',
    matcher: (relativePath) => /interactions\/.+\.js$/i.test(relativePath)
  },
  {
    component: 'Asset Manager',
    matcher: (relativePath) => /utils\/assetManager\.js$/i.test(relativePath) || /asset-discovery\/.+\.js$/i.test(relativePath)
  },
  {
    component: 'Renderer Core',
    matcher: (relativePath) => /renderer-core\/UniversalRendererCore\.js$/i.test(relativePath) || /renderer-core\/index\.js$/i.test(relativePath)
  }
];

function toPosix(value = '') {
  return String(value || '').replace(/\\/g, '/');
}

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isClassExport(value) {
  if (typeof value !== 'function') return false;
  const source = Function.prototype.toString.call(value);
  return /^class\s/.test(source);
}

function createValidationResult(status = 'pass', details = '', errors = []) {
  return { status, details, errors };
}

function summarizeValidationEntries(validations = {}) {
  const counts = { pass: 0, fail: 0, skipped: 0 };
  Object.values(validations).forEach((entry) => {
    if (!entry || !entry.status) return;
    if (counts[entry.status] !== undefined) {
      counts[entry.status] += 1;
    }
  });
  return counts;
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function walkDirectory(directoryPath, files = []) {
  const entries = await fs.readdir(directoryPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(directoryPath, entry.name);
    if (entry.isDirectory()) {
      await walkDirectory(fullPath, files);
      continue;
    }
    files.push(fullPath);
  }
  return files;
}

function shouldIncludePath(relativePath) {
  const normalized = toPosix(relativePath);
  if (!normalized.endsWith('.js')) return false;
  if (/\.test\.js$/i.test(normalized)) return false;

  const segments = normalized.split('/');
  if (segments.some((segment) => EXCLUDED_SEGMENTS.has(segment))) {
    return false;
  }

  const root = segments[0];
  if (!ARCHITECTURE_ROOTS.includes(root)) return false;

  if (normalized.endsWith('/index.js')) return true;
  if (MODULE_NAME_PATTERN.test(path.basename(normalized))) return true;

  return REQUIRED_COMPONENT_RULES.some((rule) => rule.matcher(normalized));
}

function extractImportSpecifiers(source = '') {
  const specifiers = [];
  const importRegex = /(?:import|export)\s+[\s\S]*?from\s+['"]([^'"]+)['"]/g;
  let match = importRegex.exec(source);
  while (match) {
    specifiers.push(String(match[1] || '').trim());
    match = importRegex.exec(source);
  }
  return specifiers;
}

async function resolveRelativeImportPath(fromFilePath, importSpecifier) {
  const base = path.resolve(path.dirname(fromFilePath), importSpecifier);
  const candidates = [
    base,
    `${base}.js`,
    path.join(base, 'index.js')
  ];

  for (const candidate of candidates) {
    if (await pathExists(candidate)) {
      return candidate;
    }
  }

  return null;
}

function getPrototypeMethods(instance) {
  if (!instance) return [];
  const prototype = Object.getPrototypeOf(instance);
  if (!prototype) return [];

  return Object.getOwnPropertyNames(prototype)
    .filter((name) => name !== 'constructor' && typeof instance[name] === 'function');
}

function shouldTryClassContract(name = '') {
  return /(Engine|Runtime|Core|Manager|Adapter|Pipeline|Builder|Registry)/.test(String(name || ''));
}

function createSampleRuntime() {
  return {
    sceneId: 'contract-suite-scene',
    metadata: {
      rendererAdapter: {}
    },
    graph: {
      toJSON() {
        return {
          nodes: [],
          edges: []
        };
      },
      getNodeCount() {
        return 0;
      },
      getRelationshipCount() {
        return 0;
      }
    }
  };
}

async function discoverArchitectureModules(srcRoot) {
  const discovered = [];

  for (const relativeRoot of ARCHITECTURE_ROOTS) {
    const absoluteRoot = path.join(srcRoot, relativeRoot);
    if (!(await pathExists(absoluteRoot))) continue;

    const files = await walkDirectory(absoluteRoot);
    for (const filePath of files) {
      const relativePath = toPosix(path.relative(srcRoot, filePath));
      if (!shouldIncludePath(relativePath)) continue;

      const source = await fs.readFile(filePath, 'utf8');
      discovered.push({
        absolutePath: filePath,
        relativePath,
        source,
        importSpecifiers: extractImportSpecifiers(source)
      });
    }
  }

  const uniqueByPath = new Map();
  discovered.forEach((entry) => {
    uniqueByPath.set(entry.relativePath, entry);
  });

  return [...uniqueByPath.values()].sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

async function validateDependencies(moduleEntry) {
  const errors = [];
  const checks = [];

  for (const specifier of moduleEntry.importSpecifiers) {
    if (!specifier.startsWith('.')) continue;
    checks.push((async () => {
      const resolved = await resolveRelativeImportPath(moduleEntry.absolutePath, specifier);
      if (!resolved) {
        errors.push(`Unresolved relative import: ${specifier}`);
      }
    })());
  }

  await Promise.all(checks);
  if (errors.length > 0) {
    return createValidationResult('fail', 'Relative dependency resolution failed.', errors);
  }

  return createValidationResult('pass', 'Relative dependency imports resolved.');
}

function validateContractExports(namespace, moduleEntry) {
  const exportNames = Object.keys(namespace);
  if (!exportNames.length) {
    return createValidationResult('fail', 'No exports found for module contract.', ['Module has no exports.']);
  }

  const signalRegex = /normalize|validate|migrate|serialize|deserialize|recover|repair|build|create|analyze|synchron|snapshot|persist|process|adapt|generate/i;
  const hasContractSignal = exportNames.some((name) => signalRegex.test(name));
  const hasClassOrFunctionContract = Object.entries(namespace).some(([, value]) => typeof value === 'function');
  const hasConstantContract = exportNames.some((name) => /^[A-Z0-9_]+$/.test(name));

  if (!hasContractSignal && !hasClassOrFunctionContract && !hasConstantContract) {
    return createValidationResult('fail', 'No architecture contract signal exports found.', [
      `Exports: ${exportNames.join(', ')}`,
      `Module: ${moduleEntry.relativePath}`
    ]);
  }

  return createValidationResult('pass', `Found ${exportNames.length} export(s) participating in architecture contracts.`);
}

function validateSchemaContract(namespace, moduleEntry) {
  const baseName = path.basename(moduleEntry.relativePath);
  const schemaLike = /(Schema|Migration|VersionManager|Config)\.js$/i.test(baseName);
  if (!schemaLike) {
    return createValidationResult('pass', 'Schema contract not required for this module file type.');
  }

  const isConfigModule = /Config\.js$/i.test(baseName);
  const hasSchemaSignal = /schemaVersion|LATEST_VERSION|SUPPORTED_VERSIONS|version/i.test(moduleEntry.source)
    || Object.keys(namespace).some((name) => /schema|version/i.test(name));
  const hasConfigSignal = Object.keys(namespace).some((name) => /^[A-Z0-9_]+$/.test(name))
    || /DEFAULT_|SUPPORTED_|KNOWN_/i.test(moduleEntry.source);

  if (!hasSchemaSignal && !(isConfigModule && hasConfigSignal)) {
    return createValidationResult('fail', 'Schema signals missing for schema-like module.', [
      `Module: ${moduleEntry.relativePath}`
    ]);
  }

  return createValidationResult('pass', 'Schema/version signals detected.');
}

function validateStateNormalization(namespace) {
  const normalizers = Object.entries(namespace).filter(([name, value]) => /^normalize/.test(name) && typeof value === 'function');
  if (!normalizers.length) {
    return createValidationResult('pass', 'No normalize functions exported for this module.');
  }

  const errors = [];
  let validatedCount = 0;
  let skippedCount = 0;

  const objectNormalizerNamePattern = /(State|Profile|Config|Schema|Runtime|Timeline|Scene|Template|Output|Input|Recommendation|Contract|Payload|Metadata|Node|Graph|Capability|Strategy|Adapter)/i;
  for (const [name, normalizer] of normalizers) {
    if (!objectNormalizerNamePattern.test(name)) {
      skippedCount += 1;
      continue;
    }

    try {
      const result = normalizer({
        schemaVersion: 'legacy-v0',
        metadata: { unknownFutureField: true }
      });
      if (!isObject(result)) {
        skippedCount += 1;
      } else {
        validatedCount += 1;
      }
    } catch (error) {
      errors.push(`${name} threw: ${error?.message || String(error)}`);
    }
  }

  if (errors.length > 0) {
    return createValidationResult('fail', 'State normalization checks failed.', errors);
  }

  return createValidationResult('pass', `Validated ${validatedCount} object normalize function(s); skipped ${skippedCount} scalar/helper normalize function(s).`);
}

function validateMigrationCompatibility(namespace) {
  const migrations = Object.entries(namespace).filter(([name, value]) => /^migrate/.test(name) && typeof value === 'function');
  if (!migrations.length) {
    return createValidationResult('pass', 'No migration functions exported for this module.');
  }

  const errors = [];
  for (const [name, migrate] of migrations) {
    try {
      const legacyPayload = {
        version: 'v0',
        schemaVersion: 'v0',
        legacy: true,
        metadata: {
          unknownFutureField: 'preserve-me'
        }
      };

      const migrated = migrate(legacyPayload);
      if (!isObject(migrated)) {
        errors.push(`${name} did not return an object.`);
        continue;
      }

      const migratedTwice = migrate(migrated);
      if (!isObject(migratedTwice)) {
        errors.push(`${name} is not stable for repeated migration.`);
      }
    } catch (error) {
      errors.push(`${name} threw: ${error?.message || String(error)}`);
    }
  }

  if (errors.length > 0) {
    return createValidationResult('fail', 'Migration compatibility checks failed.', errors);
  }

  return createValidationResult('pass', `Validated ${migrations.length} migration function(s).`);
}

function validateSerializationContracts(namespace) {
  const serializers = Object.entries(namespace).filter(([name, value]) => /^serialize/.test(name) && typeof value === 'function');
  const deserializers = Object.entries(namespace).filter(([name, value]) => /^deserialize/.test(name) && typeof value === 'function');

  if (!serializers.length && !deserializers.length) {
    return createValidationResult('pass', 'No serialization APIs exported for this module.');
  }

  const errors = [];
  for (const [serializeName, serialize] of serializers) {
    try {
      const serialized = serialize({
        version: 'v1',
        schemaVersion: 'v1',
        metadata: { source: 'contract-suite' }
      });

      if (typeof serialized !== 'string') {
        errors.push(`${serializeName} did not produce string output.`);
        continue;
      }

      if (deserializers.length > 0) {
        const [deserializeName, deserialize] = deserializers[0];
        const restored = deserialize(serialized);
        if (!isObject(restored)) {
          errors.push(`${deserializeName} did not produce object output.`);
        }
      }
    } catch (error) {
      errors.push(`${serializeName} threw: ${error?.message || String(error)}`);
    }
  }

  if (errors.length > 0) {
    return createValidationResult('fail', 'Serialization contract checks failed.', errors);
  }

  return createValidationResult('pass', `Validated ${serializers.length} serializer(s).`);
}

function validateLifecycleAndRecovery(namespace) {
  const classEntries = Object.entries(namespace)
    .filter(([name, value]) => shouldTryClassContract(name) && isClassExport(value));

  if (!classEntries.length) {
    return {
      lifecycle: createValidationResult('pass', 'No class lifecycle contract required for this module.'),
      recovery: createValidationResult('pass', 'No class recovery contract required for this module.')
    };
  }

  const lifecycleErrors = [];
  const recoveryErrors = [];
  let checked = 0;

  for (const [name, ClassRef] of classEntries) {
    let instance = null;
    try {
      instance = new ClassRef(createSampleRuntime(), {});
      checked += 1;
    } catch {
      try {
        instance = new ClassRef();
        checked += 1;
      } catch (error) {
        lifecycleErrors.push(`${name} could not be constructed safely: ${error?.message || String(error)}`);
        continue;
      }
    }

    const methods = getPrototypeMethods(instance);
    const requiresPauseResumePair = /(Runtime|Core|Engine)/.test(name);
    if (requiresPauseResumePair && methods.includes('pause') && !(methods.includes('resume') || methods.includes('play'))) {
      lifecycleErrors.push(`${name} exposes pause without resume.`);
    }
    if (methods.includes('persistSession') && !methods.includes('recoverSession')) {
      lifecycleErrors.push(`${name} exposes persistSession without recoverSession.`);
    }
    if (methods.includes('initialize') && !(methods.includes('build') || methods.includes('update') || methods.includes('synchronize'))) {
      lifecycleErrors.push(`${name} exposes initialize without build/update/synchronize.`);
    }

    if (typeof instance.snapshot === 'function') {
      try {
        const state = instance.snapshot();
        if (!isObject(state)) {
          lifecycleErrors.push(`${name}.snapshot() did not return object state.`);
        }
      } catch (error) {
        lifecycleErrors.push(`${name}.snapshot() threw: ${error?.message || String(error)}`);
      }
    }

    if (typeof instance.recoverSession === 'function') {
      try {
        instance.recoverSession();
      } catch (error) {
        recoveryErrors.push(`${name}.recoverSession() threw: ${error?.message || String(error)}`);
      }
    }
  }

  return {
    lifecycle: lifecycleErrors.length > 0
      ? createValidationResult('fail', `Lifecycle checks failed for ${checked} class(es).`, lifecycleErrors)
      : createValidationResult('pass', `Lifecycle checks passed for ${checked} class(es).`),
    recovery: recoveryErrors.length > 0
      ? createValidationResult('fail', 'Recovery checks failed.', recoveryErrors)
      : createValidationResult('pass', 'Recovery checks passed where available.')
  };
}

function evaluateRequiredComponentCoverage(modules = []) {
  const paths = modules.map((entry) => entry.relativePath);

  return REQUIRED_COMPONENT_RULES.map((rule) => {
    const matchedBy = paths.filter((relativePath) => rule.matcher(relativePath));
    return {
      component: rule.component,
      covered: matchedBy.length > 0,
      matchedBy
    };
  });
}

function formatDiagnostics(report) {
  const failuresByType = {
    contract: 0,
    schema: 0,
    dependency: 0,
    lifecycle: 0,
    state: 0,
    compatibility: 0,
    migration: 0,
    serialization: 0,
    recovery: 0
  };

  report.modules.forEach((moduleReport) => {
    Object.entries(moduleReport.validations).forEach(([type, result]) => {
      if (result?.status === 'fail' && failuresByType[type] !== undefined) {
        failuresByType[type] += 1;
      }
    });
  });

  const failedComponents = report.requiredComponents
    .filter((item) => !item.covered)
    .map((item) => item.component);

  return {
    failuresByType,
    failedRequiredComponents: failedComponents,
    generatedAt: report.generatedAt
  };
}

export async function runUniversalArchitectureContractTestingFramework(options = {}) {
  const srcRoot = path.resolve(options.srcRoot || path.join(process.cwd(), 'src'));
  const modules = await discoverArchitectureModules(srcRoot);

  const moduleReports = [];

  for (const moduleEntry of modules) {
    let namespace = null;
    try {
      namespace = await import(pathToFileURL(moduleEntry.absolutePath).href);
    } catch (error) {
      moduleReports.push({
        module: moduleEntry.relativePath,
        validations: {
          contract: createValidationResult('fail', 'Module import failed.', [error?.message || String(error)]),
          schema: createValidationResult('skipped', 'Skipped due to module import failure.'),
          dependency: createValidationResult('skipped', 'Skipped due to module import failure.'),
          lifecycle: createValidationResult('skipped', 'Skipped due to module import failure.'),
          state: createValidationResult('skipped', 'Skipped due to module import failure.'),
          compatibility: createValidationResult('skipped', 'Skipped due to module import failure.'),
          migration: createValidationResult('skipped', 'Skipped due to module import failure.'),
          serialization: createValidationResult('skipped', 'Skipped due to module import failure.'),
          recovery: createValidationResult('skipped', 'Skipped due to module import failure.')
        }
      });
      continue;
    }

    const dependencyValidation = await validateDependencies(moduleEntry);
    const contractValidation = validateContractExports(namespace, moduleEntry);
    const schemaValidation = validateSchemaContract(namespace, moduleEntry);
    const stateValidation = validateStateNormalization(namespace);
    const migrationValidation = validateMigrationCompatibility(namespace);
    const serializationValidation = validateSerializationContracts(namespace);
    const lifecycleAndRecovery = validateLifecycleAndRecovery(namespace);

    const compatibilityStatus = migrationValidation.status === 'fail' || stateValidation.status === 'fail'
      ? 'fail'
      : 'pass';

    moduleReports.push({
      module: moduleEntry.relativePath,
      validations: {
        contract: contractValidation,
        schema: schemaValidation,
        dependency: dependencyValidation,
        lifecycle: lifecycleAndRecovery.lifecycle,
        state: stateValidation,
        compatibility: createValidationResult(
          compatibilityStatus,
          compatibilityStatus === 'pass'
            ? 'Compatibility verified through state normalization and migration contracts.'
            : 'Compatibility risk detected from state normalization or migration failures.',
          compatibilityStatus === 'pass'
            ? []
            : [
              ...stateValidation.errors,
              ...migrationValidation.errors
            ]
        ),
        migration: migrationValidation,
        serialization: serializationValidation,
        recovery: lifecycleAndRecovery.recovery
      }
    });
  }

  const requiredComponents = evaluateRequiredComponentCoverage(modules);
  const missingRequiredComponents = requiredComponents.filter((entry) => !entry.covered);

  const aggregate = moduleReports.reduce((acc, entry) => {
    const counts = summarizeValidationEntries(entry.validations);
    acc.pass += counts.pass;
    acc.fail += counts.fail;
    acc.skipped += counts.skipped;
    return acc;
  }, { pass: 0, fail: 0, skipped: 0 });

  const report = {
    framework: 'UniversalArchitectureContractTestingFramework',
    schemaVersion: 'v1',
    generatedAt: new Date().toISOString(),
    modules: moduleReports,
    requiredComponents,
    summary: {
      moduleCount: moduleReports.length,
      discoveredModuleCount: modules.length,
      requiredComponentCount: requiredComponents.length,
      coveredRequiredComponents: requiredComponents.length - missingRequiredComponents.length,
      failedRequiredComponents: missingRequiredComponents.length,
      validations: aggregate,
      unknownFutureModuleParticipationEnabled: true
    }
  };

  report.valid = report.summary.validations.fail === 0 && missingRequiredComponents.length === 0;
  report.diagnostics = formatDiagnostics(report);

  return report;
}
