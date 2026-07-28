import { createAdaptiveFallbackTemplate } from './VisualizationTemplateSchema.js';
import { instantiateVisualizationTemplate } from './VisualizationTemplateInstantiation.js';
import { matchVisualizationTemplates } from './VisualizationTemplateMatcher.js';
import { rankVisualizationTemplates } from './VisualizationTemplateRanker.js';
import { composeVisualizationTemplates } from './VisualizationTemplateComposer.js';
import { bindTemplateSlots, bindTemplateRegions, resolveTemplateVariables } from './VisualizationTemplateBinding.js';
import { processVisualizationTemplate } from './VisualizationTemplateVersionManager.js';
import { defaultVisualizationTemplateRegistry } from './VisualizationTemplateRegistry.js';
import {
  createTemplateSelectionDiagnostics,
  finalizeTemplateSelectionDiagnostics,
  beginSelectionStage,
  endSelectionStage
} from './VisualizationTemplateSelectionDiagnostics.js';
import { toVisualizationTemplateError } from './VisualizationTemplateError.js';

const selectionCache = new Map();

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function safeString(value = '') {
  return String(value || '').trim();
}

function stableHash(input = '') {
  const text = safeString(input);
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = ((hash << 5) - hash + text.charCodeAt(index)) | 0;
  }
  return Math.abs(hash).toString(16);
}

function createCacheKey(context = {}, registry, options = {}) {
  const fingerprint = {
    visualizationRequirements: context.visualizationRequirements || {},
    selectedCapabilities: (context.selectedCapabilities || []).map((item) => item?.id || item?.capabilityId || ''),
    capabilityComposition: context.capabilityComposition || {},
    accessibilityNeeds: context.accessibilityNeeds || {},
    performanceProfile: context.performanceProfile || 'balanced',
    runtimeCapabilities: context.runtimeCapabilities || {},
    sceneConstraints: context.sceneConstraints || {},
    registryVersion: typeof registry?.getRegistryVersion === 'function' ? registry.getRegistryVersion() : 0,
    schemaVersion: options.schemaVersion || 'v1'
  };
  return stableHash(JSON.stringify(fingerprint));
}

function computeSelectionConfidence(topCandidate, secondCandidate, fallbackUsed, unresolvedRequiredCount = 0) {
  if (!topCandidate) return 0;
  const top = Number(topCandidate?.score?.normalizedScore || 0);
  const second = Number(secondCandidate?.score?.normalizedScore || 0);
  const spread = Math.max(0, top - second);
  const unresolvedPenalty = Math.max(0, Math.min(1, unresolvedRequiredCount / 4));
  const fallbackPenalty = fallbackUsed ? 0.35 : 0;
  const confidence = Math.max(0, Math.min(1, top * 0.75 + spread * 0.4 - unresolvedPenalty * 0.35 - fallbackPenalty));
  return Number(confidence.toFixed(6));
}

function buildTemplateFromComposition(composition) {
  const primary = composition?.primaryTemplate || createAdaptiveFallbackTemplate();
  return {
    ...clone(primary),
    templateId: composition?.compositionId || primary.templateId,
    name: `${primary.name || 'adaptive-template'}-composed`,
    semanticPurpose: primary.semanticPurpose || 'adaptive-purpose',
    slots: clone(composition?.mergedSlots || primary.slots || []),
    regions: clone(composition?.mergedRegions || primary.regions || []),
    relationships: clone(composition?.mergedRelationships || primary.relationships || []),
    variables: clone(composition?.sharedVariables || primary.variables || []),
    requiredCapabilities: clone((composition?.sharedCapabilities || []).map((capabilityId, index) => ({
      referenceId: `capability-ref-${index + 1}`,
      capabilityId,
      role: index === 0 ? 'primary' : 'supporting',
      required: index === 0
    }))),
    accessibility: {
      ...(primary.accessibility || {}),
      ...(composition?.accessibility || {})
    },
    performance: {
      ...(primary.performance || {}),
      ...(composition?.performance || {})
    },
    metadata: {
      ...(primary.metadata || {}),
      selectionComposed: true,
      compositionId: composition?.compositionId || null,
      compositionDiagnostics: composition?.diagnostics || {}
    }
  };
}

function buildFallbackSelection(context = {}, reason = 'registry-empty') {
  const fallbackTemplate = createAdaptiveFallbackTemplate({
    metadata: {
      fallbackReason: reason,
      generatedFromSelection: true
    }
  });
  const processed = processVisualizationTemplate(fallbackTemplate, { allowFallback: true });
  const instantiated = instantiateVisualizationTemplate(processed.template, context, {
    forceFallbackOnInvalid: true
  });

  const slotBindings = bindTemplateSlots(instantiated.instance, context, {});
  const regionBindings = bindTemplateRegions(instantiated.instance, slotBindings, context, {});
  const variableBinding = resolveTemplateVariables(instantiated.instance, context, {});

  return {
    status: 'fallback',
    selectedTemplate: instantiated.sourceTemplate,
    selectedTemplateEntry: null,
    selectedTemplateInstance: {
      ...instantiated.instance,
      resolvedVariables: variableBinding.resolved
    },
    rankedCandidates: [],
    rejectedCandidates: [],
    capabilityComposition: context.capabilityComposition || {},
    templateComposition: null,
    bindings: {
      slots: slotBindings,
      regions: regionBindings,
      variables: variableBinding
    },
    confidence: 0.2,
    warnings: [`Fallback template selected: ${reason}`],
    fallbackUsed: true,
    diagnostics: {
      fallbackReason: reason,
      unboundRequiredSlotCount: slotBindings.unboundRequiredSlots.length,
      unboundOptionalSlotCount: slotBindings.unboundOptionalSlots.length
    }
  };
}

export function invalidateTemplateSelectionCache() {
  selectionCache.clear();
}

export function selectVisualizationTemplate(context = {}, options = {}) {
  const diagnostics = createTemplateSelectionDiagnostics({
    requestId: options.requestId || `template-selection-${Date.now()}`
  });

  const registry = options.registry || defaultVisualizationTemplateRegistry;

  try {
    const registrySize = typeof registry?.size === 'number'
      ? registry.size
      : (typeof registry?.listTemplates === 'function' ? registry.listTemplates({ includeDisabled: true, includeDeprecated: true }).length : 0);
    diagnostics.registrySize = registrySize;

    if (!registrySize) {
      const fallbackResult = buildFallbackSelection(context, 'registry-empty');
      return {
        ...fallbackResult,
        diagnostics: finalizeTemplateSelectionDiagnostics(diagnostics, {
          fallbackUsed: true,
          fallbackReason: 'registry-empty',
          selectedTemplateId: fallbackResult.selectedTemplate?.templateId,
          selectedTemplateVersion: fallbackResult.selectedTemplate?.version,
          selectedScore: 0,
          selectionConfidence: fallbackResult.confidence,
          unboundRequiredSlotCount: fallbackResult.bindings.slots.unboundRequiredSlots.length,
          unboundOptionalSlotCount: fallbackResult.bindings.slots.unboundOptionalSlots.length,
          warnings: fallbackResult.warnings
        })
      };
    }

    const cacheEnabled = options.cache !== false;
    const cacheKey = createCacheKey(context, registry, options);
    if (cacheEnabled && selectionCache.has(cacheKey)) {
      const cached = clone(selectionCache.get(cacheKey));
      cached.diagnostics = finalizeTemplateSelectionDiagnostics(diagnostics, {
        ...cached.diagnostics,
        cacheHit: true
      });
      return cached;
    }

    const matchStart = beginSelectionStage();
    const matched = matchVisualizationTemplates(context, registry, options);
    diagnostics.matchingDuration = endSelectionStage(matchStart);
    diagnostics.eligibleCount = matched.candidates.length;
    diagnostics.rejectedCount = matched.rejected.length;
    diagnostics.candidateCount = matched.candidates.length;

    const rankingStart = beginSelectionStage();
    const ranked = rankVisualizationTemplates(matched.candidates, context, {
      maxResults: options.maxResults || 12
    });
    diagnostics.rankingDuration = endSelectionStage(rankingStart);
    diagnostics.rankedCount = ranked.totalRanked;

    if (!ranked.ranked.length) {
      const fallbackResult = buildFallbackSelection(context, 'no-eligible-candidates');
      return {
        ...fallbackResult,
        rejectedCandidates: matched.rejected,
        diagnostics: finalizeTemplateSelectionDiagnostics(diagnostics, {
          fallbackUsed: true,
          fallbackReason: 'no-eligible-candidates',
          selectedTemplateId: fallbackResult.selectedTemplate?.templateId,
          selectedTemplateVersion: fallbackResult.selectedTemplate?.version,
          selectedScore: 0,
          selectionConfidence: fallbackResult.confidence,
          warnings: [...matched.warnings, ...fallbackResult.warnings]
        })
      };
    }

    const topCandidate = ranked.ranked[0];
    const secondCandidate = ranked.ranked[1] || null;
    const minScore = Number(options.minimumScore ?? 0.2);

    if (Number(topCandidate?.score?.normalizedScore || 0) < minScore) {
      const fallbackResult = buildFallbackSelection(context, 'score-below-threshold');
      return {
        ...fallbackResult,
        rankedCandidates: ranked.ranked,
        rejectedCandidates: matched.rejected,
        diagnostics: finalizeTemplateSelectionDiagnostics(diagnostics, {
          fallbackUsed: true,
          fallbackReason: 'score-below-threshold',
          selectedTemplateId: fallbackResult.selectedTemplate?.templateId,
          selectedTemplateVersion: fallbackResult.selectedTemplate?.version,
          selectedScore: Number(topCandidate?.score?.totalScore || 0),
          selectionConfidence: fallbackResult.confidence,
          warnings: [...matched.warnings, ...fallbackResult.warnings]
        })
      };
    }

    const compositionStart = beginSelectionStage();
    const compositionCandidateCount = Math.max(1, Number(options.compositionCandidateCount || 2));
    const composition = composeVisualizationTemplates(ranked.ranked.slice(0, compositionCandidateCount), context, {
      ...options,
      registry
    });
    diagnostics.compositionDuration = endSelectionStage(compositionStart);

    const sourceTemplate = composition.supportingTemplates.length
      ? buildTemplateFromComposition(composition)
      : clone(topCandidate.template);

    const instantiation = instantiateVisualizationTemplate(sourceTemplate, context, {
      forceFallbackOnInvalid: true
    });

    const bindingStart = beginSelectionStage();
    const slotBindings = bindTemplateSlots(instantiation.instance, context, options);
    const regionBindings = bindTemplateRegions(instantiation.instance, slotBindings, context, options);
    const variableBinding = resolveTemplateVariables(instantiation.instance, context, options);
    diagnostics.bindingDuration = endSelectionStage(bindingStart);

    const unresolvedRequiredCount = slotBindings.unboundRequiredSlots.length + variableBinding.unresolvedRequiredVariables.length;
    const confidence = computeSelectionConfidence(topCandidate, secondCandidate, false, unresolvedRequiredCount);

    const result = {
      status: composition.supportingTemplates.length ? 'composed' : 'selected',
      selectedTemplate: instantiation.sourceTemplate,
      selectedTemplateEntry: topCandidate.registryEntry,
      selectedTemplateInstance: {
        ...instantiation.instance,
        resolvedVariables: variableBinding.resolved
      },
      rankedCandidates: ranked.ranked,
      rejectedCandidates: matched.rejected,
      capabilityComposition: context.capabilityComposition || {},
      templateComposition: composition,
      bindings: {
        slots: slotBindings,
        regions: regionBindings,
        variables: variableBinding
      },
      confidence,
      warnings: [...matched.warnings, ...(composition?.diagnostics?.warnings || []), ...slotBindings.warnings, ...regionBindings.warnings],
      fallbackUsed: false,
      diagnostics: finalizeTemplateSelectionDiagnostics(diagnostics, {
        selectedTemplateId: instantiation.sourceTemplate?.templateId,
        selectedTemplateVersion: instantiation.sourceTemplate?.version,
        selectedScore: Number(topCandidate?.score?.totalScore || 0),
        selectionConfidence: confidence,
        capabilityCoverage: Number(topCandidate?.capabilityMatches?.coverage || 0),
        requirementCoverage: Number(topCandidate?.requirementMatches?.coverage || 0),
        accessibilityCoverage: Number(topCandidate?.accessibilityMatches?.coverage || 0),
        performanceCompatibility: Number(topCandidate?.performanceMatches?.coverage || 0),
        conflictCount: Number(composition?.diagnostics?.conflictCount || 0),
        resolvedConflictCount: Number(composition?.diagnostics?.resolvedConflictCount || 0),
        dependencyCount: Number(composition?.diagnostics?.dependencyCount || 0),
        missingDependencyCount: Number(composition?.diagnostics?.missingDependencyCount || 0),
        bindingCount: Number(slotBindings?.diagnostics?.bindingCount || 0),
        unboundRequiredSlotCount: Number(slotBindings?.diagnostics?.unboundRequiredSlotCount || 0),
        unboundOptionalSlotCount: Number(slotBindings?.diagnostics?.unboundOptionalSlotCount || 0),
        compositionCount: Number(composition?.compositionOrder?.length || 0),
        fallbackUsed: false,
        warnings: [...matched.warnings, ...slotBindings.warnings, ...regionBindings.warnings]
      })
    };

    if (cacheEnabled) {
      selectionCache.set(cacheKey, clone(result));
    }

    return result;
  } catch (error) {
    const wrapped = toVisualizationTemplateError(error, {
      code: 'TEMPLATE_SELECTION_FAILED',
      stage: 'selection',
      recoverable: true,
      safeMessage: 'Template selection failed and adaptive fallback was used.'
    });

    const fallback = buildFallbackSelection(context, wrapped.code || 'selection-failed');

    return {
      ...fallback,
      status: fallback.status === 'fallback' ? 'fallback' : 'failed',
      warnings: [...fallback.warnings, wrapped.safeMessage],
      diagnostics: finalizeTemplateSelectionDiagnostics(diagnostics, {
        fallbackUsed: true,
        fallbackReason: wrapped.code || 'selection-failed',
        errors: [wrapped.safeMessage]
      })
    };
  }
}
