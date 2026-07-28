import { createEducationalObjectBlueprint } from './EducationalObjectBlueprint.js';
import { createEducationalObject } from './EducationalObjectFactory.js';
import { selectEducationalObjectRepresentation } from './EducationalObjectRepresentationSelector.js';
import { generateEducationalObjectGeometry } from './EducationalObjectGeometryGenerator.js';
import { generateEducationalObjectVisualProperties } from './EducationalObjectVisualGenerator.js';
import { generateEducationalObjectSpatialProperties } from './EducationalObjectSpatialGenerator.js';
import { generateEducationalObjectLabels } from './EducationalObjectLabelGenerator.js';
import { generateEducationalObjectNarration } from './EducationalObjectNarrationGenerator.js';
import { simplifyEducationalObjects } from './EducationalObjectSimplifier.js';
import { refineEducationalObjects } from './EducationalObjectRefiner.js';
import { salvageEducationalObjects } from './EducationalObjectSalvager.js';
import { applyEducationalObjectGenerationFallback } from './EducationalObjectFallback.js';
import { evaluateEducationalObjectQuality } from './EducationalObjectQuality.js';
import {
  EDUCATIONAL_OBJECT_GENERATOR_VERSION,
  resolveEducationalObjectGenerationConfig,
  stableHash,
  stableSortByKey
} from './EducationalObjectGenerationConfig.js';
import {
  createEducationalObjectGenerationDiagnostics,
  beginEducationalObjectGenerationStage,
  endEducationalObjectGenerationStage,
  finalizeEducationalObjectGenerationDiagnostics
} from './EducationalObjectGenerationDiagnostics.js';
import {
  createEducationalObjectGenerationCacheKey,
  getCachedEducationalObjectGeneration,
  setCachedEducationalObjectGeneration
} from './EducationalObjectGenerationCache.js';
import {
  createEducationalObjectGenerationGuardKey,
  hasPendingEducationalObjectGeneration,
  runGuardedEducationalObjectGeneration
} from './EducationalObjectGenerationGuard.js';

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function toObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function isAbortError(error) {
  return error?.name === 'AbortError' || error?.code === 'REQUEST_CANCELLED';
}

function buildGenerationFingerprint(context = {}, config = {}, options = {}) {
  return stableHash(JSON.stringify({
    generatorVersion: EDUCATIONAL_OBJECT_GENERATOR_VERSION,
    deterministicSeed: options.deterministicSeed || null,
    sceneId: context.sceneId || '',
    lessonId: context.lesson?.id || context.lessonId || '',
    classification: toObject(context.classification),
    visualizationRequirements: toObject(context.visualizationRequirements),
    concepts: toArray(context.concepts).map((item) => ({
      id: String(item?.id || item?.conceptId || ''),
      importance: Number(item?.importance ?? item?.weight ?? 0.5)
    })),
    relationships: toArray(context.relationships).map((item) => ({
      id: String(item?.id || item?.relationId || ''),
      from: String(item?.sourceId || item?.sourceConceptId || item?.from || ''),
      to: String(item?.targetId || item?.targetConceptId || item?.to || ''),
      required: item?.required === true
    })),
    slotBindings: toArray(context.slotBindings).map((item) => ({
      slotId: String(item?.slotId || ''),
      regionId: String(item?.regionId || ''),
      required: item?.required !== false
    })),
    regionBindings: toArray(context.regionBindings).map((item) => ({
      regionId: String(item?.regionId || ''),
      capacity: Number(item?.capacity || 1)
    })),
    accessibilityNeeds: toObject(context.accessibilityNeeds),
    performanceProfile: config.profile,
    maximumObjects: config.maximumObjects
  }));
}

function normalizeDescriptorId(seed, index) {
  const base = `${String(seed || 'object').trim() || 'object'}-${index + 1}`;
  const cleaned = base.replace(/[^a-zA-Z0-9_\-:.]/g, '-');
  return cleaned.slice(0, 160);
}

function buildDescriptorsFromBlueprint(blueprint = {}, context = {}, config = {}) {
  const concepts = toArray(blueprint.conceptPlan?.concepts);
  const relationships = toArray(blueprint.relationshipPlan?.relationships);
  const capabilities = toArray(blueprint.capabilityPlan?.selectedCapabilities);
  const slotBindings = toArray(blueprint.slotPlan?.bindings);
  const regionBindings = toArray(blueprint.regionPlan?.bindings);

  const conceptObjectIdMap = new Map(
    concepts.map((concept, index) => [String(concept.conceptId), normalizeDescriptorId(`educational-object-${concept.conceptId || 'concept'}`, index)])
  );

  const conceptDescriptors = concepts.map((concept, index) => {
    const binding = slotBindings[index % Math.max(1, slotBindings.length)] || {};
    const regionBinding = regionBindings[index % Math.max(1, regionBindings.length)] || {};

    const representation = selectEducationalObjectRepresentation(concept, relationships, capabilities, context, {
      performanceProfile: config.profile
    });

    const objectId = conceptObjectIdMap.get(String(concept.conceptId)) || normalizeDescriptorId(`educational-object-${concept.conceptId || 'concept'}`, index);
    const localRelationships = relationships.filter((item) => item.sourceConceptId === concept.conceptId || item.targetConceptId === concept.conceptId);
    const geometryHints = generateEducationalObjectGeometry(representation, concept, context, {
      performanceProfile: config.profile
    });
    const visualProperties = generateEducationalObjectVisualProperties(representation, concept, context, {
      performanceProfile: config.profile
    });

    const descriptor = {
      objectId,
      id: objectId,
      version: 'v1',
      name: String(concept.label || `Concept ${index + 1}`),
      description: String(concept.metadata?.description || ''),
      kind: String(concept.kind || concept.type || 'generic-educational-object'),
      semanticRole: String(concept.role || (index === 0 ? 'primary-concept' : 'supporting-concept')),
      learningPurpose: 'inspect',
      source: 'procedural-generator',
      status: 'active',
      conceptReferences: [{
        referenceId: `concept-ref-${index + 1}`,
        conceptId: String(concept.conceptId),
        role: 'focus',
        importance: Number(concept.importance || 0.5),
        confidence: 0.8,
        metadata: {}
      }],
      relationshipReferences: localRelationships.map((relation, relationIndex) => ({
        relationId: String(relation.relationId || `relation-${index + 1}-${relationIndex + 1}`),
        sourceObjectId: relation.sourceConceptId === concept.conceptId
          ? objectId
          : (conceptObjectIdMap.get(String(relation.sourceConceptId)) || normalizeDescriptorId(`educational-object-${relation.sourceConceptId}`, index)),
        targetObjectId: relation.targetConceptId === concept.conceptId
          ? objectId
          : (conceptObjectIdMap.get(String(relation.targetConceptId)) || normalizeDescriptorId(`educational-object-${relation.targetConceptId}`, index)),
        relation: String(relation.relation || 'related-to'),
        direction: 'directed',
        weight: Number(relation.weight || 1),
        required: relation.required === true,
        metadata: relation.metadata || {}
      })),
      capabilityReferences: capabilities.map((capability, capabilityIndex) => ({
        capabilityId: String(capability.id),
        role: String(capability.role || 'supporting'),
        required: capability.required !== false,
        priority: capabilityIndex + 1,
        overrides: {},
        metadata: {}
      })),
      templateBindings: [{
        templateId: String(context.template?.templateId || ''),
        templateInstanceId: String(context.templateInstance?.instanceId || ''),
        slotId: String(binding.slotId || ''),
        regionId: String(binding.regionId || regionBinding.regionId || ''),
        role: 'generated-binding',
        priority: index + 1,
        constraints: [],
        metadata: {}
      }],
      representation,
      geometryHints,
      visualProperties,
      spatialProperties: {
        slotBinding: String(binding.slotId || ''),
        regionBinding: String(binding.regionId || regionBinding.regionId || '')
      },
      metadata: {
        conceptId: String(concept.conceptId),
        importance: Number(concept.importance || 0.5),
        generated: true,
        generationFingerprint: blueprint.metadata?.generationFingerprint || ''
      },
      extensions: {
        blueprint: {
          blueprintId: blueprint.blueprintId,
          conceptIndex: index
        }
      }
    };

    descriptor.spatialProperties = generateEducationalObjectSpatialProperties(descriptor, {
      slotId: descriptor.templateBindings[0]?.slotId || null,
      regionId: descriptor.templateBindings[0]?.regionId || null,
      templateInstanceId: descriptor.templateBindings[0]?.templateInstanceId || null
    }, descriptor.relationshipReferences, context, {
      objectIndex: index,
      performanceProfile: config.profile
    });

    descriptor.labels = generateEducationalObjectLabels(descriptor, concept, context, {
      objectIndex: index,
      readingOrder: index + 1,
      priority: index + 1
    });
    descriptor.narration = generateEducationalObjectNarration(descriptor, concept, context, { objectIndex: index });

    descriptor.accessibility = {
      textDescription: descriptor.narration.shortText,
      screenReaderLabel: descriptor.labels[0]?.text || descriptor.name,
      screenReaderDescription: descriptor.narration.text,
      keyboardAccessible: context.accessibilityNeeds?.keyboardCompatible !== false,
      focusable: true,
      focusOrder: index + 1,
      readingOrder: index + 1,
      reducedMotionCompatible: context.accessibilityNeeds?.reducedMotionCompatible !== false,
      highContrastCompatible: context.accessibilityNeeds?.highContrastCompatible !== false,
      nonVisualAlternative: 'text-summary',
      interactionInstructions: true,
      audioDescription: true,
      captionSupport: true,
      metadata: {}
    };

    descriptor.performance = {
      minimumProfile: config.profile === 'high' ? 'balanced' : 'low',
      maximumProfile: 'high',
      complexityScore: Number((0.3 + Number(concept.importance || 0.5) * 0.5).toFixed(6)),
      geometryBudget: config.profile === 'low' ? 4 : config.profile === 'high' ? 14 : 8,
      materialBudget: config.profile === 'low' ? 3 : config.profile === 'high' ? 10 : 6,
      textureBudget: config.profile === 'low' ? 2 : config.profile === 'high' ? 8 : 5,
      animationBudget: context.accessibilityNeeds?.reducedMotionCompatible ? 1 : (config.profile === 'low' ? 2 : 4),
      interactionBudget: config.profile === 'low' ? 2 : 5,
      memoryHint: config.profile,
      instancingRecommended: Number(concept.importance || 0.5) < 0.65,
      lodRecommended: config.profile !== 'high',
      mobileSuitability: config.profile !== 'high',
      lowPowerAlternative: true,
      simplificationPriority: Number(concept.importance || 0.5) >= 0.7 ? 1 : 2,
      metadata: {}
    };

    return descriptor;
  });

  return stableSortByKey(conceptDescriptors.slice(0, Math.max(1, config.maximumObjects)), 'objectId');
}

function instantiateFactoryDescriptors(descriptors = [], context = {}, config = {}, qualitySummary = null, fallbackLevel = 0) {
  const knownObjectIds = descriptors.map((item) => String(item.objectId || item.id || ''));

  return descriptors.map((descriptor, index) => createEducationalObject(descriptor, {
    sceneId: context.sceneId || 'scene',
    templateInstance: context.templateInstance || null,
    classification: context.classification || {},
    visualizationRequirements: context.visualizationRequirements || {},
    capabilityComposition: context.capabilityComposition || {},
    concepts: context.concepts || [],
    relationships: context.relationships || [],
    timelineRequirements: context.timelineRequirements || context.orderedSteps || [],
    interactionRequirements: context.interactionRequirements || [],
    accessibilityNeeds: context.accessibilityNeeds || {},
    performanceProfile: config.profile,
    runtimeCapabilities: context.runtimeCapabilities || {},
    metadata: context.metadata || {},
    objectIndex: index
  }, {
    fallbackEnabled: config.fallbackEnabled,
    knownObjectIds,
    qualitySummary,
    fallbackLevel
  }));
}

async function runGeneration(context = {}, options = {}, shared = {}) {
  const diagnostics = shared.diagnostics || createEducationalObjectGenerationDiagnostics();
  const totalStart = beginEducationalObjectGenerationStage();
  const config = resolveEducationalObjectGenerationConfig(context, options);
  diagnostics.profile = config.profile;
  diagnostics.qualityThreshold = config.qualityThreshold;

  if (options.signal?.aborted) {
    return {
      status: 'cancelled',
      source: 'procedural',
      objects: [],
      objectInstances: [],
      blueprint: null,
      quality: null,
      fallbackLevel: 0,
      fallbackUsed: false,
      cacheHit: false,
      deduplicated: Boolean(shared.deduplicated),
      warnings: ['generation-cancelled-before-start'],
      errors: [],
      diagnostics: finalizeEducationalObjectGenerationDiagnostics(diagnostics, {
        deduplicated: Boolean(shared.deduplicated),
        totalDuration: 0
      })
    };
  }

  const blueprintStart = beginEducationalObjectGenerationStage();
  const blueprint = createEducationalObjectBlueprint(context, config);
  diagnostics.blueprintDuration = endEducationalObjectGenerationStage(blueprintStart);

  const generationFingerprint = buildGenerationFingerprint(context, config, options);
  diagnostics.generationFingerprint = generationFingerprint;

  const cacheKey = createEducationalObjectGenerationCacheKey({
    generationFingerprint,
    schemaVersion: 'v1',
    generatorVersion: EDUCATIONAL_OBJECT_GENERATOR_VERSION,
    performanceProfile: config.profile,
    maximumObjects: config.maximumObjects
  });

  if (config.useCache && options.useCache !== false) {
    const cached = getCachedEducationalObjectGeneration(cacheKey);
    if (cached) {
      return {
        ...cached,
        cacheHit: true,
        deduplicated: Boolean(shared.deduplicated) || Boolean(cached.deduplicated),
        diagnostics: finalizeEducationalObjectGenerationDiagnostics(diagnostics, {
          ...(cached.diagnostics || {}),
          cacheHit: true,
          deduplicated: Boolean(shared.deduplicated) || Boolean(cached.deduplicated)
        })
      };
    }
  }

  const generationStart = beginEducationalObjectGenerationStage();
  const descriptors = buildDescriptorsFromBlueprint(blueprint, context, config);
  diagnostics.generationDuration = endEducationalObjectGenerationStage(generationStart);

  const simplified = simplifyEducationalObjects(descriptors, {
    maximumObjects: config.maximumObjects
  }, {
    reduceLabelDensity: config.profile === 'low',
    reduceOptionalRelationships: config.profile === 'low'
  });
  diagnostics.simplificationDuration = 0;

  let refinedDescriptors = simplified.objects;
  let status = simplified.simplified ? 'refined' : 'generated';
  let fallbackLevel = 0;
  let fallbackUsed = false;
  const warnings = [...(simplified.notes || [])];
  const errors = [];

  const refinementStart = beginEducationalObjectGenerationStage();
  const refined = refineEducationalObjects(refinedDescriptors, context, {
    refinementPasses: config.refinementPasses
  });
  diagnostics.refinementDuration = endEducationalObjectGenerationStage(refinementStart);
  refinedDescriptors = refined.objects;
  if (refined.refined) status = 'refined';
  warnings.push(...(refined.notes || []));

  const factoryResults = instantiateFactoryDescriptors(refinedDescriptors, context, config, null, fallbackLevel);
  const objects = stableSortByKey(factoryResults.map((item) => item.object), 'objectId');
  const objectInstances = stableSortByKey(factoryResults.map((item) => item.objectInstance), 'instanceId');
  factoryResults.forEach((item) => {
    warnings.push(...(item.warnings || []));
    errors.push(...(item.errors || []));
  });

  const qualityStart = beginEducationalObjectGenerationStage();
  let quality = evaluateEducationalObjectQuality(objects, {
    ...context,
    slotBindings: blueprint.slotPlan?.bindings || context.slotBindings || [],
    regionBindings: blueprint.regionPlan?.bindings || context.regionBindings || []
  }, {
    qualityThreshold: config.qualityThreshold
  });
  diagnostics.qualityDuration = endEducationalObjectGenerationStage(qualityStart);

  let finalObjects = objects;
  let finalInstances = objectInstances;

  if (!quality.passed) {
    const salvageStart = beginEducationalObjectGenerationStage();
    const salvaged = salvageEducationalObjects(finalObjects, context, {
      fallbackEnabled: config.fallbackEnabled
    });
    diagnostics.salvageDuration = endEducationalObjectGenerationStage(salvageStart);
    warnings.push(...(salvaged.warnings || []));
    errors.push(...(salvaged.errors || []));

    finalObjects = salvaged.objects;
    const salvagedFactory = instantiateFactoryDescriptors(finalObjects, context, config, quality, 2);
    finalInstances = stableSortByKey(salvagedFactory.map((item) => item.objectInstance), 'instanceId');

    quality = evaluateEducationalObjectQuality(finalObjects, {
      ...context,
      slotBindings: blueprint.slotPlan?.bindings || context.slotBindings || [],
      regionBindings: blueprint.regionPlan?.bindings || context.regionBindings || []
    }, {
      qualityThreshold: config.qualityThreshold
    });

    if (quality.passed) {
      status = 'salvaged';
    } else if (config.fallbackEnabled !== false && options.fallbackEnabled !== false) {
      const fallbackLevels = [1, 2, 3, 4, 5];
      let fallbackResult = null;
      for (const level of fallbackLevels) {
        fallbackResult = applyEducationalObjectGenerationFallback(level, {
          objects: finalObjects,
          objectInstances: finalInstances,
          quality,
          blueprint
        }, {
          ...context,
          slotBindings: blueprint.slotPlan?.bindings || context.slotBindings || [],
          regionBindings: blueprint.regionPlan?.bindings || context.regionBindings || []
        }, {
          performanceProfile: config.profile,
          maximumObjects: config.maximumObjects,
          qualitySummary: quality
        });

        const candidateQuality = evaluateEducationalObjectQuality(fallbackResult.objects, {
          ...context,
          slotBindings: blueprint.slotPlan?.bindings || context.slotBindings || [],
          regionBindings: blueprint.regionPlan?.bindings || context.regionBindings || []
        }, {
          qualityThreshold: Math.min(config.qualityThreshold, 50)
        });

        if (candidateQuality.passed || level === 5) {
          quality = candidateQuality;
          finalObjects = fallbackResult.objects;
          finalInstances = fallbackResult.objectInstances;
          fallbackLevel = fallbackResult.fallbackLevel;
          fallbackUsed = true;
          status = 'fallback';
          warnings.push(...(fallbackResult.warnings || []));
          errors.push(...(fallbackResult.errors || []));
          break;
        }
      }
    }
  }

  diagnostics.objectCount = finalObjects.length;
  diagnostics.instanceCount = finalInstances.length;
  diagnostics.qualityScore = Number(quality?.score || 0);
  diagnostics.fallbackLevel = fallbackLevel;
  diagnostics.cacheHit = false;

  const result = {
    status,
    source: 'procedural',
    objects: finalObjects,
    objectInstances: finalInstances,
    blueprint,
    quality,
    fallbackLevel,
    fallbackUsed,
    cacheHit: false,
    deduplicated: Boolean(shared.deduplicated),
    warnings,
    errors,
    diagnostics: finalizeEducationalObjectGenerationDiagnostics(diagnostics, {
      deduplicated: Boolean(shared.deduplicated),
      qualityScore: Number(quality?.score || 0),
      fallbackLevel,
      objectCount: finalObjects.length,
      instanceCount: finalInstances.length,
      generationDuration: endEducationalObjectGenerationStage(totalStart)
    })
  };

  if (status !== 'cancelled' && status !== 'failed' && finalObjects.length > 0) {
    setCachedEducationalObjectGeneration(cacheKey, {
      ...result,
      warnings: [],
      errors: [],
      diagnostics: {
        generationFingerprint,
        profile: config.profile,
        qualityScore: Number(quality?.score || 0),
        fallbackLevel,
        objectCount: finalObjects.length,
        instanceCount: finalInstances.length,
        cacheHit: false,
        deduplicated: Boolean(shared.deduplicated)
      }
    });
  }

  return result;
}

export async function generateEducationalObjects(context = {}, options = {}) {
  const diagnostics = createEducationalObjectGenerationDiagnostics();
  const config = resolveEducationalObjectGenerationConfig(context, options);
  const generationFingerprint = buildGenerationFingerprint(context, config, options);
  diagnostics.generationFingerprint = generationFingerprint;

  const guardKey = createEducationalObjectGenerationGuardKey({
    sceneId: context.sceneId || '',
    lessonId: context.lessonId || context.lesson?.id || '',
    fingerprint: generationFingerprint,
    performanceProfile: config.profile,
    schemaVersion: 'v1',
    generatorVersion: EDUCATIONAL_OBJECT_GENERATOR_VERSION,
    deterministicSeed: options.deterministicSeed || ''
  });

  const wasPending = hasPendingEducationalObjectGeneration(guardKey);

  const generationPromise = runGuardedEducationalObjectGeneration(guardKey, options.signal, async () => runGeneration(context, options, {
    diagnostics,
    deduplicated: false
  }));

  try {
    const result = await generationPromise;
    if (!wasPending) return result;
    return {
      ...result,
      deduplicated: true,
      diagnostics: finalizeEducationalObjectGenerationDiagnostics(result.diagnostics || diagnostics, {
        deduplicated: true
      })
    };
  } catch (error) {
    if (isAbortError(error)) {
      if (options.fallbackEnabled === true && options.generateFallbackOnCancel === true) {
        const fallback = applyEducationalObjectGenerationFallback(5, {}, context, {
          performanceProfile: options.performanceProfile || context.performanceProfile || 'balanced',
          maximumObjects: options.maximumObjects || config.maximumObjects
        });
        return {
          status: 'fallback',
          source: fallback.source,
          objects: fallback.objects,
          objectInstances: fallback.objectInstances,
          blueprint: null,
          quality: evaluateEducationalObjectQuality(fallback.objects, context, { qualityThreshold: config.qualityThreshold }),
          fallbackLevel: fallback.fallbackLevel,
          fallbackUsed: true,
          cacheHit: false,
          deduplicated: false,
          warnings: [...fallback.warnings, 'generation-cancelled-fallback-enabled'],
          errors: [],
          diagnostics: finalizeEducationalObjectGenerationDiagnostics(diagnostics, {
            fallbackLevel: fallback.fallbackLevel,
            fallbackReason: 'cancelled'
          })
        };
      }

      return {
        status: 'cancelled',
        source: 'procedural',
        objects: [],
        objectInstances: [],
        blueprint: null,
        quality: null,
        fallbackLevel: 0,
        fallbackUsed: false,
        cacheHit: false,
        deduplicated: false,
        warnings: ['generation-cancelled'],
        errors: [],
        diagnostics: finalizeEducationalObjectGenerationDiagnostics(diagnostics, {
          fallbackLevel: 0,
          fallbackReason: 'cancelled'
        })
      };
    }

    if (config.fallbackEnabled !== false && options.fallbackEnabled !== false) {
      const fallback = applyEducationalObjectGenerationFallback(5, {}, context, {
        performanceProfile: options.performanceProfile || context.performanceProfile || config.profile,
        maximumObjects: options.maximumObjects || config.maximumObjects
      });

      return {
        status: 'fallback',
        source: fallback.source,
        objects: fallback.objects,
        objectInstances: fallback.objectInstances,
        blueprint: null,
        quality: evaluateEducationalObjectQuality(fallback.objects, context, { qualityThreshold: config.qualityThreshold }),
        fallbackLevel: fallback.fallbackLevel,
        fallbackUsed: true,
        cacheHit: false,
        deduplicated: false,
        warnings: fallback.warnings,
        errors: [String(error?.message || 'generation-failed')],
        diagnostics: finalizeEducationalObjectGenerationDiagnostics(diagnostics, {
          fallbackLevel: fallback.fallbackLevel,
          fallbackReason: 'exception',
          errors: [String(error?.message || 'generation-failed')]
        })
      };
    }

    return {
      status: 'failed',
      source: 'procedural',
      objects: [],
      objectInstances: [],
      blueprint: null,
      quality: null,
      fallbackLevel: 0,
      fallbackUsed: false,
      cacheHit: false,
      deduplicated: false,
      warnings: [],
      errors: [String(error?.message || 'generation-failed')],
      diagnostics: finalizeEducationalObjectGenerationDiagnostics(diagnostics, {
        errors: [String(error?.message || 'generation-failed')]
      })
    };
  }
}
