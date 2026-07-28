import { evaluateEducationalObjectQuality } from './EducationalObjectQuality.js';
import { processEducationalObject } from './EducationalObjectVersionManager.js';
import { runEducationalObjectIntegrityChecks } from './EducationalObjectIntegrity.js';
import { createEducationalObjectTrust } from './EducationalObjectTrust.js';

function toObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function clamp(value, min, max, fallback) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(min, Math.min(max, num));
}

function containsUnsafePatterns(value) {
  const text = JSON.stringify(value || {}).toLowerCase();
  return text.includes('javascript:')
    || text.includes('data:text/html')
    || text.includes('<script')
    || text.includes('onerror=')
    || text.includes('onclick=')
    || text.includes('__proto__')
    || text.includes('new function')
    || text.includes('eval(')
    || text.includes('import(');
}

export function evaluateEducationalObjectQualityGate(objectOrInstance = {}, context = {}, options = {}) {
  const registrationThreshold = clamp(options.registrationThreshold, 0, 100, 65);
  const poolThreshold = clamp(options.poolThreshold, 0, 100, 75);
  const sharedUseThreshold = clamp(options.sharedUseThreshold, 0, 100, 80);
  const mode = String(options.mode || 'registration');
  const threshold = mode === 'pool' ? poolThreshold : mode === 'shared' ? sharedUseThreshold : registrationThreshold;

  const source = toObject(objectOrInstance);
  const objectCandidate = source.objectId && source.version && source.kind
    ? source
    : toObject(source.sourceObject || source.object || {});

  const processed = processEducationalObject(objectCandidate, {
    allowFallback: false,
    knownObjectIds: options.knownObjectIds || []
  });
  const integrity = runEducationalObjectIntegrityChecks(processed.object, {
    knownObjectIds: options.knownObjectIds || []
  });

  const trust = createEducationalObjectTrust(options.trust || source.trust || {}, {
    source: options.source || source.source || 'unknown'
  });

  const quality = evaluateEducationalObjectQuality([processed.object], {
    concepts: context.concepts || [],
    relationships: context.relationships || [],
    slotBindings: context.slotBindings || [],
    regionBindings: context.regionBindings || [],
    orderedSteps: context.orderedSteps || [],
    interactionRequirements: context.interactionRequirements || []
  }, {
    qualityThreshold: threshold
  });

  const hardFailures = [];
  const warnings = [];
  const recommendations = [];

  if (processed.status === 'fallback' || !processed.valid) hardFailures.push('processing-failed');
  if (integrity.status === 'invalid') hardFailures.push('integrity-invalid');
  if (containsUnsafePatterns(processed.object) || containsUnsafePatterns(source)) hardFailures.push('security-unsafe-pattern');

  if (quality.score < threshold) {
    warnings.push('quality-below-threshold');
    recommendations.push('refine-object-quality-metadata');
  }

  if (mode === 'pool' && source?.lifecycle?.destroyed === true) {
    hardFailures.push('destroyed-lifecycle-state');
  }

  if (mode === 'shared' && ['trusted', 'system'].includes(String(trust.level)) === false) {
    warnings.push('insufficient-trust-for-shared-use');
  }

  if (source?.runtimeMetadata?.behaviorRuntimeState?.active === true) {
    warnings.push('active-behavior-runtime-must-pause-before-pool');
  }

  const passed = hardFailures.length === 0 && quality.score >= threshold;

  return {
    passed,
    score: quality.score,
    threshold,
    hardFailures,
    warnings,
    recommendations,
    quarantineRecommended: hardFailures.length > 0 || quality.score < Math.max(0, threshold - 15),
    fallbackRecommended: quality.score < threshold,
    diagnostics: {
      mode,
      processingStatus: processed.status,
      integrityStatus: integrity.status,
      trust,
      quality,
      securityFailure: hardFailures.includes('security-unsafe-pattern')
    }
  };
}
