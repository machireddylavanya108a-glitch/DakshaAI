import { createAdaptiveFallbackTemplate, createDefaultTemplateAccessibility, createDefaultTemplatePerformance } from './VisualizationTemplateSchema.js';
import { processVisualizationTemplate } from './VisualizationTemplateVersionManager.js';
import { instantiateVisualizationTemplate } from './VisualizationTemplateInstantiation.js';
import { bindTemplateSlots, bindTemplateRegions, resolveTemplateVariables } from './VisualizationTemplateBinding.js';
import { defaultVisualizationTemplateRegistry } from './VisualizationTemplateRegistry.js';
import { createVisualizationTemplateBlueprint } from './VisualizationTemplateBlueprint.js';
import { generateTemplateLayout } from './VisualizationTemplateLayoutGenerator.js';
import { generateTemplateSlots } from './VisualizationTemplateSlotGenerator.js';
import { generateTemplateRegions } from './VisualizationTemplateRegionGenerator.js';
import { generateTemplateRelationships } from './VisualizationTemplateRelationshipGenerator.js';
import { simplifyVisualizationTemplate } from './VisualizationTemplateSimplifier.js';
import { refineVisualizationTemplate } from './VisualizationTemplateRefiner.js';
import { salvageVisualizationTemplate } from './VisualizationTemplateSalvager.js';
import { applyTemplateGenerationFallback } from './VisualizationTemplateFallback.js';
import { evaluateVisualizationTemplateQuality } from './VisualizationTemplateQuality.js';
import {
  VISUALIZATION_TEMPLATE_GENERATOR_VERSION,
  resolveGenerationConfig,
  stableHash
} from './VisualizationTemplateGenerationConfig.js';
import {
  createTemplateGenerationDiagnostics,
  finalizeTemplateGenerationDiagnostics,
  beginGenerationStage,
  endGenerationStage
} from './VisualizationTemplateGenerationDiagnostics.js';
import {
  createTemplateGenerationCacheKey,
  getCachedGeneratedTemplate,
  setCachedGeneratedTemplate
} from './VisualizationTemplateGenerationCache.js';

const pendingGenerations = new Map();

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function isAbortError(error) {
  return error?.name === 'AbortError' || error?.code === 'REQUEST_CANCELLED';
}

function createAbortError() {
  const error = new Error('Template generation cancelled.');
  error.name = 'AbortError';
  error.code = 'REQUEST_CANCELLED';
  return error;
}

function buildGenerationFingerprint(context = {}, config = {}, blueprint = null, options = {}) {
  const payload = {
    schemaVersion: 'v1',
    generatorVersion: VISUALIZATION_TEMPLATE_GENERATOR_VERSION,
    deterministicSeed: options.deterministicSeed || null,
    classification: context.classification || {},
    requirements: context.visualizationRequirements || {},
    selectedCapabilities: (context.selectedCapabilities || []).map((item) => item?.id || item?.capabilityId || ''),
    capabilityComposition: context.capabilityComposition || {},
    accessibilityNeeds: context.accessibilityNeeds || {},
    performanceProfile: config.profile,
    runtimeCapabilities: config.runtimeCapabilities || {},
    sceneConstraints: context.sceneConstraints || {},
    blueprintId: blueprint?.blueprintId || null
  };
  return stableHash(JSON.stringify(payload));
}

function shouldGenerateTemplate(context = {}, options = {}) {
  if (options.forceGenerate === true) return { generate: true, reason: 'force-generate' };

  const selection = context.failedTemplateSelection || {};
  const diagnostics = selection.diagnostics || {};

  if (selection.status === 'fallback' && diagnostics.fallbackReason === 'registry-empty') {
    return { generate: true, reason: 'registry-empty' };
  }

  if (selection.status === 'fallback' && diagnostics.fallbackReason === 'no-eligible-candidates') {
    return { generate: true, reason: 'no-eligible-candidates' };
  }

  if (selection.status === 'fallback' && diagnostics.fallbackReason === 'score-below-threshold') {
    return { generate: true, reason: 'score-below-threshold' };
  }

  if (selection.status === 'fallback') {
    return { generate: true, reason: diagnostics.fallbackReason || 'selection-fallback' };
  }

  if (selection.selectedTemplate && !options.forceGenerate) {
    const capabilityCoverage = Number(diagnostics.capabilityCoverage || 0);
    const accessibilityCoverage = Number(diagnostics.accessibilityCoverage || 0);
    const performanceCompatibility = Number(diagnostics.performanceCompatibility || 0);

    if (capabilityCoverage < 0.75) return { generate: true, reason: 'capability-gap' };
    if (accessibilityCoverage < 0.75) return { generate: true, reason: 'accessibility-gap' };
    if (performanceCompatibility < 0.75) return { generate: true, reason: 'performance-gap' };

    return { generate: false, reason: 'selection-suitable' };
  }

  if (context.preferredTemplate && !options.forceGenerate) {
    return { generate: false, reason: 'preferred-template-available' };
  }

  return { generate: true, reason: 'no-suitable-template' };
}

function buildGeneratedTemplate(blueprint = {}, layout = {}, slots = [], regions = [], relationships = [], context = {}, config = {}, options = {}) {
  const generationFingerprint = String(blueprint.metadata?.generationFingerprint || options.deterministicSeed || 'fingerprint');
  const semanticPurpose = String(blueprint.semanticPurpose || 'adaptive-purpose');

  const requiredCapabilities = (blueprint.capabilityPlan?.selectedCapabilities || []).map((item, index) => ({
    referenceId: `generated-cap-ref-${index + 1}`,
    capabilityId: item.id,
    role: item.role || (index === 0 ? 'primary' : 'supporting'),
    required: item.required === true || index === 0,
    priority: index + 1,
    constraints: [],
    overrides: {},
    metadata: {}
  }));

  const templateId = `generated-template-${generationFingerprint}`;
  return {
    ...createAdaptiveFallbackTemplate(),
    templateId,
    version: 'v1',
    name: `generated-${semanticPurpose}`,
    source: 'procedural',
    semanticPurpose,
    requiredCapabilities,
    optionalCapabilities: [],
    slots,
    regions,
    relationships,
    layout,
    accessibility: {
      ...createDefaultTemplateAccessibility(),
      ...(context.accessibilityNeeds?.textAlternativeRequired ? { textDescription: 'Procedurally generated accessible educational visualization template.' } : {}),
      reducedMotionCompatibility: context.accessibilityNeeds?.reducedMotionCompatible !== false,
      highContrastCompatibility: context.accessibilityNeeds?.highContrastCompatible !== false,
      keyboardNavigation: context.accessibilityNeeds?.keyboardCompatible !== false
    },
    performance: {
      ...createDefaultTemplatePerformance(),
      minimumProfile: config.profile === 'auto' ? 'balanced' : config.profile,
      maximumProfile: 'high',
      objectBudget: config.maximumSlots,
      animationBudget: Math.max(2, Math.floor(config.maximumSlots / 2)),
      interactionBudget: Math.max(2, Math.floor(config.maximumSlots / 2)),
      assetBudget: Math.max(2, Math.floor(config.maximumSlots / 2))
    },
    metadata: {
      fallback: false,
      source: 'procedural',
      generationFingerprint,
      classificationFingerprint: stableHash(JSON.stringify(context.classification || {})),
      capabilityFingerprint: stableHash(JSON.stringify((context.selectedCapabilities || []).map((item) => item?.id || item?.capabilityId || ''))),
      requirementFingerprint: stableHash(JSON.stringify(context.visualizationRequirements || {})),
      createdAt: new Date().toISOString(),
      generatorVersion: VISUALIZATION_TEMPLATE_GENERATOR_VERSION,
      confidence: Number(context.metadata?.confidence || 0.7),
      qualityThreshold: config.qualityThreshold
    }
  };
}

function bindTemplateArtifacts(instance = {}, context = {}, options = {}) {
  const slotBindings = bindTemplateSlots(instance, context, options);
  const regionBindings = bindTemplateRegions(instance, slotBindings, context, options);
  const variableBinding = resolveTemplateVariables(instance, context, options);

  return {
    slots: slotBindings,
    regions: regionBindings,
    variables: variableBinding
  };
}

function shouldRegisterResult(result = {}, config = {}, options = {}) {
  if (options.registerGeneratedTemplate === false || config.registerGeneratedTemplate === false) return false;
  if (!result?.quality?.passed) return false;
  if (result.fallbackLevel >= 4 && options.allowFallbackRegistration !== true && config.allowFallbackRegistration !== true) return false;
  return true;
}

function registerGeneratedTemplate(result = {}, context = {}, options = {}) {
  const registry = options.registry || defaultVisualizationTemplateRegistry;
  const template = result.processedTemplate?.template || result.template;
  if (!template || !registry || typeof registry.registerTemplate !== 'function') {
    return { registered: false, duplicate: false };
  }

  const existing = typeof registry.hasTemplate === 'function' && registry.hasTemplate(template.templateId, template.version);
  if (existing) {
    return { registered: false, duplicate: true };
  }

  const registration = registry.registerTemplate(template, {
    source: 'procedural',
    trustLevel: 0.45,
    metadata: {
      generated: true,
      generationFingerprint: template.metadata?.generationFingerprint || null,
      qualityScore: result.quality?.score || 0
    },
    runtimeOnly: true
  });

  return {
    registered: Boolean(registration?.entry),
    duplicate: Boolean(registration?.duplicate)
  };
}

async function runGeneration(context = {}, options = {}, shared = {}) {
  const diagnostics = shared.diagnostics || createTemplateGenerationDiagnostics();
  const totalStart = beginGenerationStage();
  const config = resolveGenerationConfig(context, options);
  diagnostics.qualityThreshold = config.qualityThreshold;

  if (options.signal?.aborted) {
    return {
      status: 'cancelled',
      source: 'procedural',
      template: null,
      processedTemplate: null,
      templateInstance: null,
      bindings: null,
      quality: null,
      generationPlan: null,
      fallbackLevel: 0,
      fallbackUsed: false,
      registered: false,
      cacheHit: false,
      warnings: [],
      errors: [],
      diagnostics: finalizeTemplateGenerationDiagnostics(diagnostics, {
        errors: [],
        warnings: ['generation-cancelled-before-start'],
        generationDuration: 0
      })
    };
  }

  const decision = shouldGenerateTemplate(context, options);
  const preferred = context.preferredTemplate || context.failedTemplateSelection?.selectedTemplate || null;

  if (!decision.generate && preferred) {
    const processedPreferred = processVisualizationTemplate(preferred, { allowFallback: true });
    const qualityPreferred = evaluateVisualizationTemplateQuality(processedPreferred.template, context, config);
    const preferredInstantiation = instantiateVisualizationTemplate(processedPreferred.template, context, { forceFallbackOnInvalid: true });
    const preferredBindings = bindTemplateArtifacts(preferredInstantiation.instance, context, config);

    return {
      status: qualityPreferred.passed ? 'generated' : 'fallback',
      source: 'existing-template',
      template: processedPreferred.template,
      processedTemplate: processedPreferred,
      templateInstance: preferredInstantiation.instance,
      bindings: preferredBindings,
      quality: qualityPreferred,
      generationPlan: null,
      fallbackLevel: qualityPreferred.passed ? 0 : 2,
      fallbackUsed: !qualityPreferred.passed,
      registered: false,
      cacheHit: false,
      warnings: [],
      errors: [],
      diagnostics: finalizeTemplateGenerationDiagnostics(diagnostics, {
        generationDuration: endGenerationStage(totalStart),
        qualityScore: qualityPreferred.score,
        source: 'existing-template'
      })
    };
  }

  const blueprintStage = beginGenerationStage();
  const generationPlan = createVisualizationTemplateBlueprint(context, { ...config, ...options });
  diagnostics.generationFingerprint = generationPlan.metadata?.generationFingerprint || '';
  diagnostics.generationDuration = endGenerationStage(blueprintStage);

  const cacheFingerprint = {
    generationFingerprint: generationPlan.metadata?.generationFingerprint,
    profile: config.profile,
    limits: {
      maximumSlots: config.maximumSlots,
      maximumRegions: config.maximumRegions,
      maximumRelationships: config.maximumRelationships
    },
    generatorVersion: VISUALIZATION_TEMPLATE_GENERATOR_VERSION,
    schemaVersion: 'v1'
  };
  const cacheKey = createTemplateGenerationCacheKey(cacheFingerprint);

  if (config.useCache && options.useCache !== false) {
    const cached = getCachedGeneratedTemplate(cacheKey);
    if (cached) {
      return {
        ...cached,
        cacheHit: true,
        diagnostics: finalizeTemplateGenerationDiagnostics(diagnostics, {
          ...cached.diagnostics,
          cacheHit: true,
          deduplicated: shared.deduplicated === true
        })
      };
    }
  }

  const layoutStart = beginGenerationStage();
  const layout = generateTemplateLayout(generationPlan, context, config);
  diagnostics.layoutDuration = endGenerationStage(layoutStart);

  const slotStart = beginGenerationStage();
  const slots = generateTemplateSlots(generationPlan, context, config);
  diagnostics.slotDuration = endGenerationStage(slotStart);

  const regionStart = beginGenerationStage();
  const regions = generateTemplateRegions(generationPlan, slots, context, config);
  diagnostics.regionDuration = endGenerationStage(regionStart);

  const relationshipStart = beginGenerationStage();
  const relationships = generateTemplateRelationships(generationPlan, slots, regions, context, config);
  diagnostics.relationshipDuration = endGenerationStage(relationshipStart);

  let generated = buildGeneratedTemplate(generationPlan, layout, slots, regions, relationships, context, config, options);

  const simplification = simplifyVisualizationTemplate(generated, config, {
    reduceMotion: context.accessibilityNeeds?.reducedMotionCompatible === true
  });
  generated = simplification.template;
  diagnostics.simplificationApplied = simplification.simplified;

  const validationStart = beginGenerationStage();
  let processed = processVisualizationTemplate(generated, { allowFallback: true });
  diagnostics.validationDuration = endGenerationStage(validationStart);
  diagnostics.repairDuration = Number(processed.diagnostics?.repairDuration || 0);
  diagnostics.migrationDuration = Number(processed.diagnostics?.migrationDuration || 0);
  diagnostics.integrityDuration = Number(processed.diagnostics?.integrityDuration || 0);

  const refinementStart = beginGenerationStage();
  const refinement = refineVisualizationTemplate(processed.template, context, config);
  diagnostics.refinementDuration = endGenerationStage(refinementStart);
  diagnostics.refinementPasses = refinement.passes;

  if (refinement.refined) {
    processed = processVisualizationTemplate(refinement.template, { allowFallback: true });
  }

  const qualityStart = beginGenerationStage();
  let quality = evaluateVisualizationTemplateQuality(processed.template, context, config);
  diagnostics.qualityDuration = endGenerationStage(qualityStart);

  let fallbackLevel = 0;
  let fallbackUsed = false;
  let status = refinement.refined ? 'refined' : 'generated';
  let warnings = [...(processed.warnings || []), ...refinement.notes, ...quality.warnings];
  let errors = [...(processed.errors || [])];

  if (!quality.passed) {
    const salvageStart = beginGenerationStage();
    const salvaged = salvageVisualizationTemplate(processed.template, context, config);
    diagnostics.salvageApplied = true;
    diagnostics.refinementDuration += endGenerationStage(salvageStart);

    if (salvaged.quality?.passed) {
      processed = salvaged.processedTemplate;
      quality = salvaged.quality;
      status = 'salvaged';
      warnings = [...warnings, ...(salvaged.warnings || [])];
      errors = [...errors, ...(salvaged.errors || [])];
    } else if (config.fallbackEnabled !== false && options.fallbackEnabled !== false) {
      const fallback = applyTemplateGenerationFallback(4, processed.template, context, config);
      processed = fallback.processedTemplate;
      fallbackLevel = fallback.fallbackLevel;
      fallbackUsed = true;
      status = 'fallback';
      warnings = [...warnings, ...(fallback.warnings || [])];
      errors = [...errors, ...(fallback.errors || [])];
      quality = evaluateVisualizationTemplateQuality(processed.template, context, config);
    }
  }

  const instantiationStart = beginGenerationStage();
  const instantiation = instantiateVisualizationTemplate(processed.template, context, { forceFallbackOnInvalid: true });
  diagnostics.instantiationDuration = endGenerationStage(instantiationStart);

  const bindingStart = beginGenerationStage();
  const bindings = bindTemplateArtifacts(instantiation.instance, context, config);
  diagnostics.bindingDuration = endGenerationStage(bindingStart);

  const unresolvedRequiredCount = Number(bindings.slots?.unboundRequiredSlots?.length || 0) + Number(bindings.variables?.unresolvedRequiredVariables?.length || 0);

  const result = {
    status,
    source: 'procedural',
    template: processed.template,
    processedTemplate: processed,
    templateInstance: {
      ...instantiation.instance,
      resolvedVariables: bindings.variables.resolved
    },
    bindings,
    quality,
    generationPlan,
    fallbackLevel,
    fallbackUsed,
    registered: false,
    cacheHit: false,
    warnings: [...new Set(warnings.map((item) => String(item)))],
    errors: [...new Set(errors.map((item) => String(item)))],
    diagnostics: finalizeTemplateGenerationDiagnostics(diagnostics, {
      source: 'procedural',
      cacheHit: false,
      fallbackLevel,
      qualityScore: quality.score,
      generatedSlotCount: processed.template?.slots?.length || 0,
      generatedRegionCount: processed.template?.regions?.length || 0,
      generatedRelationshipCount: processed.template?.relationships?.length || 0,
      capabilityCoverage: Number(quality.components?.capabilityCoverage || 0),
      requirementCoverage: Number(quality.components?.requirementCoverage || 0),
      accessibilityCoverage: Number(quality.components?.accessibilityCoverage || 0),
      performanceCompatibility: Number(quality.components?.performanceCompatibility || 0),
      bindingCoverage: Number(quality.components?.bindingReadiness || 0),
      unresolvedRequiredCount,
      simplificationApplied: diagnostics.simplificationApplied === true || simplification.simplified === true,
      warnings,
      errors
    })
  };

  if (shouldRegisterResult(result, config, options)) {
    const registration = registerGeneratedTemplate(result, context, options);
    result.registered = registration.registered;
    if (registration.duplicate) {
      result.warnings.push('registration-duplicate-skipped');
    }
  }

  if (config.useCache && options.useCache !== false && quality.passed) {
    setCachedGeneratedTemplate(cacheKey, {
      ...clone(result),
      diagnostics: {
        requestId: result.diagnostics.requestId,
        generationFingerprint: result.diagnostics.generationFingerprint,
        source: result.diagnostics.source,
        fallbackLevel: result.diagnostics.fallbackLevel,
        qualityScore: result.diagnostics.qualityScore,
        generatedSlotCount: result.diagnostics.generatedSlotCount,
        generatedRegionCount: result.diagnostics.generatedRegionCount,
        generatedRelationshipCount: result.diagnostics.generatedRelationshipCount
      }
    });
  }

  result.diagnostics.totalDuration = endGenerationStage(totalStart);
  return result;
}

export async function generateVisualizationTemplate(context = {}, options = {}) {
  const config = resolveGenerationConfig(context, options);
  const diagnostics = createTemplateGenerationDiagnostics({
    requestId: options.requestId || `template-generation-${Date.now()}`,
    source: 'procedural'
  });

  const blueprint = createVisualizationTemplateBlueprint(context, { ...config, ...options });
  const generationFingerprint = buildGenerationFingerprint(context, config, blueprint, options);
  diagnostics.generationFingerprint = generationFingerprint;

  if (options.signal?.aborted) {
    return {
      status: 'cancelled',
      source: 'procedural',
      template: null,
      processedTemplate: null,
      templateInstance: null,
      bindings: null,
      quality: null,
      generationPlan: blueprint,
      fallbackLevel: 0,
      fallbackUsed: false,
      registered: false,
      cacheHit: false,
      warnings: [],
      errors: [],
      diagnostics: finalizeTemplateGenerationDiagnostics(diagnostics, {
        warnings: ['generation-cancelled-before-start']
      })
    };
  }

  if (pendingGenerations.has(generationFingerprint)) {
    const pending = pendingGenerations.get(generationFingerprint);
    const result = await pending;
    return {
      ...result,
      diagnostics: {
        ...(result.diagnostics || {}),
        deduplicated: true
      }
    };
  }

  const runPromise = runGeneration(context, { ...options, ...config }, { diagnostics, deduplicated: false })
    .catch((error) => {
      if (isAbortError(error)) {
        return {
          status: 'cancelled',
          source: 'procedural',
          template: null,
          processedTemplate: null,
          templateInstance: null,
          bindings: null,
          quality: null,
          generationPlan: blueprint,
          fallbackLevel: 0,
          fallbackUsed: false,
          registered: false,
          cacheHit: false,
          warnings: [],
          errors: [],
          diagnostics: finalizeTemplateGenerationDiagnostics(diagnostics, {
            warnings: ['generation-cancelled'],
            errors: []
          })
        };
      }

      if (config.fallbackEnabled === false || options.fallbackEnabled === false) {
        return {
          status: 'failed',
          source: 'procedural',
          template: null,
          processedTemplate: null,
          templateInstance: null,
          bindings: null,
          quality: null,
          generationPlan: blueprint,
          fallbackLevel: 0,
          fallbackUsed: false,
          registered: false,
          cacheHit: false,
          warnings: [],
          errors: [String(error?.message || 'generation-failed')],
          diagnostics: finalizeTemplateGenerationDiagnostics(diagnostics, {
            errors: [String(error?.message || 'generation-failed')]
          })
        };
      }

      const fallback = applyTemplateGenerationFallback(5, null, context, config);
      return {
        status: 'fallback',
        source: 'procedural',
        template: fallback.template,
        processedTemplate: fallback.processedTemplate,
        templateInstance: fallback.templateInstance || null,
        bindings: fallback.bindings || null,
        quality: evaluateVisualizationTemplateQuality(fallback.template, context, config),
        generationPlan: blueprint,
        fallbackLevel: fallback.fallbackLevel,
        fallbackUsed: true,
        registered: false,
        cacheHit: false,
        warnings: fallback.warnings || [],
        errors: [String(error?.message || 'generation-failed')],
        diagnostics: finalizeTemplateGenerationDiagnostics(diagnostics, {
          fallbackLevel: fallback.fallbackLevel,
          fallbackReason: 'exception',
          errors: [String(error?.message || 'generation-failed')]
        })
      };
    })
    .finally(() => {
      pendingGenerations.delete(generationFingerprint);
    });

  pendingGenerations.set(generationFingerprint, runPromise);

  if (options.signal) {
    if (options.signal.aborted) throw createAbortError();
    options.signal.addEventListener('abort', () => {
      pendingGenerations.delete(generationFingerprint);
    }, { once: true });
  }

  return runPromise;
}
