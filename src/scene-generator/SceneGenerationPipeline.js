import { processSceneJsonPipeline } from './SceneVersionManager.js';
import { loadScene } from '../scene-builder/SceneRuntime.js';
import { buildScenePlanningPrompt } from './ScenePromptBuilder.js';
import { requestScenePlanFromProvider } from './SceneAIClient.js';
import { parseSceneResponse } from './SceneResponseParser.js';
import { generateFallbackScene } from './SceneFallbackGenerator.js';
import { sceneGenerationCache } from './SceneGenerationCache.js';
import { runWithSceneRetries } from './SceneGenerationRetry.js';
import { createGenerationGuardKey, runGuardedGeneration } from './SceneGenerationGuard.js';
import {
  addSceneGenerationError,
  addSceneGenerationEvent,
  addSceneGenerationWarning,
  beginTimedStage,
  createSceneGenerationDiagnostics,
  endTimedStage,
  finalizeSceneGenerationDiagnostics,
  markSceneGenerationTiming,
  sanitizeDiagnosticsForOutput
} from './SceneGenerationDiagnostics.js';
import {
  getPerformanceLimits,
  normalizeSceneGenerationConfig
} from './SceneGenerationConfig.js';
import { SceneGenerationError, toSceneGenerationError } from './SceneGenerationError.js';
import { resolveVisualizationCapabilities } from '../visualization-capabilities/index.js';
import { analyzeVisualizationStrategy, normalizeVisualizationStrategyProfile } from '../visualization-strategy/index.js';
import { analyzeCapabilityTemplateRecommendation } from '../recommendation/index.js';
import { analyzeUniversalConfidenceConflictFallback } from '../confidence-fallback/index.js';
import {
  generateVisualizationTemplate,
  selectVisualizationTemplate
} from '../visualization-templates/index.js';
import {
  generateEducationalObjects,
  ensureSceneEducationalObjectBehaviorMetadata,
  createEducationalObjectBehaviorRuntime
} from '../educational-objects/index.js';
import { getUniversalAssetRegistryState, resolveAssetFromRegistry } from '../utils/assetManager.js';
import { analyzeUniversalAssetDiscoveryMatchingResolution } from '../asset-discovery/index.js';

function stableHash(input = '') {
  const text = String(input || '');
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = ((hash << 5) - hash + text.charCodeAt(index)) | 0;
  }
  return Math.abs(hash).toString(16);
}

function removeUnsafeHtml(text = '') {
  return String(text || '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/on[a-z]+\s*=\s*"[^"]*"/gi, '')
    .replace(/on[a-z]+\s*=\s*'[^']*'/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/data:text\/html/gi, '')
    .trim();
}

function collectTextBlocks(value, blocks = []) {
  if (typeof value === 'string') {
    const cleaned = removeUnsafeHtml(value).replace(/\s+/g, ' ').trim();
    if (cleaned) blocks.push(cleaned);
    return blocks;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectTextBlocks(item, blocks));
    return blocks;
  }

  if (!value || typeof value !== 'object') return blocks;

  Object.values(value).forEach((nested) => collectTextBlocks(nested, blocks));
  return blocks;
}

function pruneValue(value, seen = new WeakSet()) {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'function') return undefined;
  if (typeof value === 'bigint') return Number(value);

  if (typeof value === 'string') {
    if (/^data:[^;]+;base64,/i.test(value) && value.length > 4096) {
      return '[removed-large-base64]';
    }
    return removeUnsafeHtml(value);
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => pruneValue(item, seen))
      .filter((item) => item !== undefined);
  }

  if (typeof value !== 'object') return value;

  if (seen.has(value)) return '[circular]';
  seen.add(value);

  const output = Object.create(null);
  Object.entries(value).forEach(([key, nested]) => {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') return;
    const next = pruneValue(nested, seen);
    if (next !== undefined && !(typeof next === 'string' && !next.trim())) {
      output[key] = next;
    }
  });
  return output;
}

function compactParagraphs(blocks = [], maxChars = 14000) {
  const unique = [];
  const seen = new Set();

  blocks.forEach((block) => {
    const key = block.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(block);
    }
  });

  const output = [];
  let used = 0;

  for (const block of unique) {
    if (used >= maxChars) break;
    const remaining = maxChars - used;
    const next = block.slice(0, remaining);
    output.push(next);
    used += next.length;
  }

  return output;
}

function normalizeInput(input = {}) {
  const pruned = pruneValue(input) || {};
  const textBlocks = collectTextBlocks(pruned, []);
  const compacted = compactParagraphs(textBlocks, 15000);

  const title = String(pruned.title || pruned.lesson?.title || pruned.topic || 'Adaptive Learning Scene').trim();
  const topic = String(pruned.topic || pruned.subject || title || 'Open Topic').trim();

  const concepts = Array.isArray(pruned.keyConcepts)
    ? pruned.keyConcepts
    : Array.isArray(pruned.concepts)
      ? pruned.concepts
      : [];

  const steps = Array.isArray(pruned.lessonSteps)
    ? pruned.lessonSteps
    : Array.isArray(pruned.steps)
      ? pruned.steps
      : [];

  const goals = Array.isArray(pruned.learningGoals)
    ? pruned.learningGoals
    : Array.isArray(pruned.goals)
      ? pruned.goals
      : [];

  const examples = Array.isArray(pruned.examples) ? pruned.examples : [];

  const normalized = {
    id: String(pruned.lessonId || pruned.id || stableHash(topic)).slice(0, 64),
    title,
    topic,
    content: compacted,
    concepts,
    steps,
    goals,
    examples,
    difficulty: String(pruned.difficulty || 'adaptive'),
    classification: pruned.classification && typeof pruned.classification === 'object' ? pruned.classification : {},
    source: String(pruned.sourceMetadata?.source || pruned.source || 'lesson-input'),
    metadata: {
      ...(pruned.sourceMetadata && typeof pruned.sourceMetadata === 'object' ? pruned.sourceMetadata : {}),
      learnerContext: pruned.learnerContext && typeof pruned.learnerContext === 'object' ? pruned.learnerContext : {},
      locale: String(pruned.locale || 'en')
    },
    learnerContext: pruned.learnerContext && typeof pruned.learnerContext === 'object' ? pruned.learnerContext : {}
  };

  const existingVisualizationStrategy = pruned.visualizationStrategy
    || pruned.sourceMeta?.visualizationStrategy
    || normalized.classification?.visualizationStrategy
    || null;

  normalized.visualizationStrategy = existingVisualizationStrategy && typeof existingVisualizationStrategy === 'object'
    ? normalizeVisualizationStrategyProfile(existingVisualizationStrategy)
    : analyzeVisualizationStrategy({
      sourceType: normalized.source,
      sourceName: normalized.title,
      content: normalized.content.join(' '),
      intent: normalized.classification?.visualizationStrategy?.metadata?.intent || {}
    });

  normalized.classification = {
    ...(normalized.classification || {}),
    visualizationStrategy: normalized.visualizationStrategy
  };

  if (!normalized.content.length) {
    normalized.content = [normalizeInputFallbackContent(normalized)];
  }

  return normalized;
}

function normalizeInputFallbackContent(normalizedInput) {
  const title = normalizedInput?.title || normalizedInput?.topic || 'this lesson';
  return `Learn ${title} through adaptive concepts, examples, and guided steps.`;
}

function materializeRendererPayload(runtimeScene, scene, performanceLimits) {
  const nodes = runtimeScene?.graph?.toJSON?.()?.nodes || [];
  const objectNodes = nodes.filter((node) => String(node?.metadata?.sourceKey || '').toLowerCase() === 'objects');
  const educationalObjectInstanceNodes = nodes.filter((node) => String(node?.metadata?.sourceKey || '').toLowerCase() === 'educationalobjectinstances');
  const labelNodes = nodes.filter((node) => String(node?.metadata?.sourceKey || '').toLowerCase() === 'labels');
  const interactionNodes = nodes.filter((node) => String(node?.metadata?.sourceKey || '').toLowerCase() === 'interactions');
  const timelineNodes = nodes.filter((node) => String(node?.metadata?.sourceKey || '').toLowerCase() === 'timeline');
  const preferredObjectNodes = educationalObjectInstanceNodes.length ? educationalObjectInstanceNodes : objectNodes;

  const maxObjects = Math.max(1, Number(performanceLimits?.maxObjects || 50));
  const clippedObjectNodes = preferredObjectNodes.slice(0, maxObjects);

  const objects = clippedObjectNodes.map((node, index) => {
    const raw = node?.properties || {};
    const representation = raw?.resolvedRepresentation || raw?.representation || {};
    const spatial = raw?.resolvedState?.spatial || raw?.spatialProperties || {};
    const accessibility = raw?.resolvedAccessibility || raw?.accessibility || {};
    const performance = raw?.resolvedPerformance || raw?.performance || {};
    const info = raw?.properties || {};
    return {
      id: node.id,
      label: raw.name || raw.objectId || `Object ${index + 1}`,
      category: raw.type || raw.kind || raw?.runtimeMetadata?.kind || raw?.metadata?.category || 'dynamic',
      position: Array.isArray(raw.position)
        ? raw.position
        : Array.isArray(spatial.relativePosition)
          ? spatial.relativePosition
          : [index, 0, 0],
      size: Array.isArray(raw.scale)
        ? raw.scale
        : Array.isArray(spatial.relativeScale)
          ? spatial.relativeScale
          : [1, 1, 1],
      color: info.color || '#34d399',
      facts: Array.isArray(info.facts) ? info.facts.slice(0, 3) : [],
      representationMode: String(representation.mode || 'adaptive'),
      accessibilityLabel: String(accessibility.screenReaderLabel || raw.name || ''),
      complexity: Number(performance.complexityScore || 0)
    };
  });

  const objectIndex = new Map(objects.map((item) => [item.id, item]));

  const labels = (labelNodes.length ? labelNodes : objects.map((item) => ({ id: item.id, properties: { text: item.label, targetObjectId: item.id } })))
    .map((node, index) => ({
      id: node.id || `label-${index + 1}`,
      text: String(node?.properties?.text || objects[index]?.label || `Label ${index + 1}`),
      position: objectIndex.get(node?.properties?.targetObjectId)?.position || [0, 0, 0]
    }));

  const hotspots = (interactionNodes.length
    ? interactionNodes
    : objects.map((item, index) => ({ id: `interaction-${index + 1}`, properties: { label: item.label, details: item.facts, targetObjectId: item.id } })))
    .map((node, index) => ({
      id: node.id || `hotspot-${index + 1}`,
      label: String(node?.properties?.label || objects[index]?.label || `Hotspot ${index + 1}`),
      details: Array.isArray(node?.properties?.details) ? node.properties.details.slice(0, 3) : [],
      position: objectIndex.get(node?.properties?.targetObjectId)?.position || [0, 0, 0]
    }));

  const maxTimelineSteps = Math.max(1, Number(performanceLimits?.maxTimelineSteps || 16));
  const timeline = (timelineNodes.length ? timelineNodes : (scene?.timeline || []).map((step) => ({ id: step.id, properties: step })))
    .slice(0, maxTimelineSteps)
    .map((node, index) => ({
      id: node.id || `step-${index + 1}`,
      title: String(node?.properties?.title || `Step ${index + 1}`),
      durationMs: Number(node?.properties?.duration || 1200),
      cameraMode: String(node?.properties?.camera?.movement?.mode || 'orbit'),
      replay: true
    }));

  const sceneRootNode = nodes.find((node) => String(node?.id || '') === String(scene?.sceneId || ''));
  const behaviorRuntime = sceneRootNode?.runtimeData?.behaviorRuntime || {};
  const effectEvents = Array.isArray(behaviorRuntime?.effectEvents) ? behaviorRuntime.effectEvents : [];

  const models = objects.map((object, index) => ({
    id: `model-${index + 1}`,
    label: object.label,
    category: object.category,
    position: object.position,
    size: object.size,
    color: object.color
  }));

  return {
    objects,
    labels,
    hotspots,
    timeline,
    effectEvents,
    models,
    accessibility: {
      textDescription: `Interactive educational scene with ${objects.length} concept objects and ${timeline.length} timeline steps.`,
      objectDescriptions: objects.map((item) => `${item.label}: ${item.facts[0] || 'concept node'}`),
      narrationText: (scene?.narration?.text || '').slice(0, 400),
      interactionInstructions: hotspots.slice(0, 8).map((item) => `Inspect ${item.label}`),
      reducedMotionCompatible: true,
      keyboardNavigationHints: ['Use arrow keys to switch timeline steps.', 'Use Enter to inspect focused concept.'],
      contrastHints: ['Prefer high contrast labels for readability.']
    }
  };
}

function createCancelledResult(diagnostics, includeDev) {
  return {
    status: 'cancelled',
    source: 'request',
    scene: null,
    runtimeScene: null,
    runtimeGraph: null,
    rendererPayload: null,
    diagnostics: sanitizeDiagnosticsForOutput(diagnostics, { includeDev }),
    warnings: [],
    fallbackUsed: false,
    cacheHit: false
  };
}

function buildSuccessResult({
  status,
  source,
  scene,
  runtimeScene,
  rendererPayload,
  diagnostics,
  warnings = [],
  fallbackUsed = false,
  cacheHit = false,
  includeDev
}) {
  return {
    status,
    source,
    scene,
    runtimeScene,
    runtimeGraph: runtimeScene?.graph?.toJSON?.() || null,
    rendererPayload,
    diagnostics: sanitizeDiagnosticsForOutput(diagnostics, { includeDev }),
    warnings,
    fallbackUsed,
    cacheHit
  };
}

async function buildSceneArtifacts(scene, performanceLimits, diagnostics) {
  const stageStart = beginTimedStage();
  const processed = processSceneJsonPipeline(scene, {
    sourceType: 'scene-generation',
    fallbackTitle: scene?.title || 'Safe Scene',
    fallbackSubject: scene?.subject || 'General Learning'
  });
  const runtimeScene = loadScene(processed);

  const behaviorRuntime = createEducationalObjectBehaviorRuntime({
    ...runtimeScene,
    sceneJson: processed,
    metadata: processed.metadata || {}
  }, {
    maximumEffectsPerDispatch: Number(performanceLimits?.maxInteractions || 100),
    maximumStateHistory: 50,
    maximumRelationshipDepth: 20,
    maximumAutomaticBehaviorChain: 25
  });

  behaviorRuntime.load();
  behaviorRuntime.start();

  const bootstrapEvent = behaviorRuntime.dispatch({
    signalId: `signal-bootstrap-${processed.sceneId}`,
    type: 'manual',
    source: 'scene-bootstrap',
    sourceObjectId: processed.educationalObjectInstances?.[0]?.objectId || null,
    targetObjectIds: [],
    timelineStepId: null,
    interactionId: null,
    payload: {
      sceneId: processed.sceneId,
      reason: 'initial-runtime-sync'
    },
    timestamp: Date.now(),
    metadata: {}
  });

  processed.metadata = {
    ...(processed.metadata || {}),
    behaviorRuntimeDiagnostics: behaviorRuntime.getDiagnostics(),
    behaviorRuntimeSummary: {
      loaded: true,
      started: true,
      emittedEvents: Array.isArray(bootstrapEvent?.events) ? bootstrapEvent.events.length : 0
    }
  };

  runtimeScene.behaviorRuntime = behaviorRuntime;
  const rendererPayload = materializeRendererPayload(runtimeScene, processed, performanceLimits);
  markSceneGenerationTiming(diagnostics, 'sceneBuildDuration', endTimedStage(stageStart));
  return { scene: processed, runtimeScene, rendererPayload };
}

function isAbortError(error) {
  return error?.name === 'AbortError' || error?.code === 'REQUEST_CANCELLED';
}

function minimalWarnings(list = []) {
  return list.filter(Boolean).map((item) => String(item)).slice(0, 12);
}

function summarizeTemplateSelection(selection = {}) {
  return {
    status: selection.status || 'failed',
    fallbackUsed: selection.fallbackUsed === true,
    selectedTemplateId: selection.selectedTemplate?.templateId || null,
    selectedTemplateVersion: selection.selectedTemplate?.version || null,
    selectedTemplateInstanceId: selection.selectedTemplateInstance?.instanceId || null,
    compositionId: selection.templateComposition?.compositionId || null,
    confidence: Number(selection.confidence || 0),
    warnings: minimalWarnings(selection.warnings || []),
    diagnostics: {
      selectedScore: Number(selection.diagnostics?.selectedScore || 0),
      selectionConfidence: Number(selection.diagnostics?.selectionConfidence || 0),
      capabilityCoverage: Number(selection.diagnostics?.capabilityCoverage || 0),
      requirementCoverage: Number(selection.diagnostics?.requirementCoverage || 0),
      accessibilityCoverage: Number(selection.diagnostics?.accessibilityCoverage || 0),
      performanceCompatibility: Number(selection.diagnostics?.performanceCompatibility || 0),
      conflictCount: Number(selection.diagnostics?.conflictCount || 0),
      missingDependencyCount: Number(selection.diagnostics?.missingDependencyCount || 0),
      unboundRequiredSlotCount: Number(selection.diagnostics?.unboundRequiredSlotCount || 0),
      unboundOptionalSlotCount: Number(selection.diagnostics?.unboundOptionalSlotCount || 0)
    }
  };
}

function summarizeCapabilityTemplateRecommendation(recommendation = {}) {
  return {
    schemaVersion: recommendation.schemaVersion || 'v2',
    confidenceScore: Number(recommendation.confidenceScore || 0),
    recommendedCapabilityCount: Array.isArray(recommendation.recommendedCapabilities)
      ? recommendation.recommendedCapabilities.length
      : 0,
    recommendedTemplateCount: Array.isArray(recommendation.recommendedTemplates)
      ? recommendation.recommendedTemplates.length
      : 0,
    proceduralGenerationRecommended: recommendation?.fallbackStrategy?.recommendProceduralGeneration === true,
    fallbackReason: recommendation?.fallbackStrategy?.reason || null,
    fallbackMode: recommendation?.fallbackStrategy?.mode || null,
    requiredEducationalObjects: recommendation?.requiredEducationalObjects || null,
    channels: {
      animation: minimalWarnings(recommendation.animationCapabilities || []),
      interaction: minimalWarnings(recommendation.interactionCapabilities || []),
      simulation: minimalWarnings(recommendation.simulationCapabilities || []),
      assessment: minimalWarnings(recommendation.assessmentCapabilities || []),
      narration: minimalWarnings(recommendation.narrationCapabilities || [])
    },
    diagnostics: recommendation?.diagnostics || {}
  };
}

function shouldGenerateTemplateFromRecommendation(selection = {}, recommendation = {}, options = {}) {
  if (options.forceTemplateGeneration === true) {
    return { generate: true, reason: 'force-template-generation' };
  }

  if (selection?.status === 'failed') {
    return { generate: true, reason: 'selection-failed' };
  }

  if (recommendation?.fallbackStrategy?.recommendProceduralGeneration === true) {
    return {
      generate: true,
      reason: recommendation?.fallbackStrategy?.reason || 'recommendation-procedural-fallback'
    };
  }

  const confidenceFloor = Number.isFinite(Number(options.minimumRecommendationConfidence))
    ? Number(options.minimumRecommendationConfidence)
    : 0;
  if (Number(recommendation?.confidenceScore || 0) < confidenceFloor) {
    return { generate: true, reason: 'recommendation-confidence-below-floor' };
  }

  const selectedTemplateId = selection?.selectedTemplate?.templateId || '';
  const recommendedTemplates = Array.isArray(recommendation?.recommendedTemplates)
    ? recommendation.recommendedTemplates
    : [];
  const hasRecommendedTemplate = recommendedTemplates.length > 0;

  if (!selectedTemplateId && !hasRecommendedTemplate) {
    return { generate: true, reason: 'no-template-recommendation' };
  }

  if (selection?.status === 'fallback' && !hasRecommendedTemplate) {
    return { generate: true, reason: selection?.diagnostics?.fallbackReason || 'selection-fallback' };
  }

  return { generate: false, reason: 'recommendation-suitable' };
}

function summarizeTemplateGeneration(generation = {}) {
  return {
    status: generation.status || 'failed',
    source: generation.source || 'procedural',
    templateId: generation.template?.templateId || null,
    templateVersion: generation.template?.version || null,
    templateInstanceId: generation.templateInstance?.instanceId || null,
    fallbackLevel: Number(generation.fallbackLevel || 0),
    fallbackUsed: generation.fallbackUsed === true,
    qualityScore: Number(generation.quality?.score || 0),
    qualityPassed: generation.quality?.passed === true,
    cacheHit: generation.cacheHit === true,
    registered: generation.registered === true,
    diagnostics: {
      generationFingerprint: generation.diagnostics?.generationFingerprint || null,
      generatedSlotCount: Number(generation.diagnostics?.generatedSlotCount || 0),
      generatedRegionCount: Number(generation.diagnostics?.generatedRegionCount || 0),
      generatedRelationshipCount: Number(generation.diagnostics?.generatedRelationshipCount || 0),
      refinementPasses: Number(generation.diagnostics?.refinementPasses || 0)
    }
  };
}

function buildAiConfidenceMetadata(scene = {}, selection = {}, recommendation = {}) {
  const sceneConfidence = Number(scene?.metadata?.confidence || scene?.classification?.confidence || 0);
  const selectionConfidence = Number(selection?.confidence || 0);
  const recommendationConfidence = Number(recommendation?.confidenceScore || 0);
  const aggregate = (sceneConfidence * 0.34) + (selectionConfidence * 0.33) + (recommendationConfidence * 0.33);

  return {
    confidence: aggregate,
    overallConfidence: aggregate,
    metrics: {
      sceneConfidence,
      selectionConfidence,
      recommendationConfidence
    },
    conflicts: []
  };
}

function buildAssetRegistrySceneMetadata(scene = {}, objectGeneration = {}) {
  const ids = [];
  const sceneAssetPlan = Array.isArray(scene?.assetPlan) ? scene.assetPlan : [];
  const reusableAssets = Array.isArray(scene?.reusableAssets) ? scene.reusableAssets : [];
  const generatedObjects = Array.isArray(objectGeneration?.objects) ? objectGeneration.objects : [];

  const collectId = (value) => {
    const id = String(value || '').trim();
    if (id && !ids.includes(id)) {
      ids.push(id);
    }
  };

  sceneAssetPlan.forEach((entry) => collectId(entry?.assetId || entry?.id));
  reusableAssets.forEach((entry) => collectId(entry));
  generatedObjects.forEach((entry) => {
    collectId(entry?.assetId || entry?.representation?.assetId || entry?.metadata?.assetId);
  });

  const resolvedAssets = ids
    .map((id) => resolveAssetFromRegistry(id, 'latest'))
    .filter(Boolean)
    .map((asset) => ({
      assetId: asset.id,
      version: asset.version || 'latest',
      type: asset.type || 'unknown-asset-type',
      category: asset.category || 'General',
      source: asset.source || 'registry',
      tags: Array.isArray(asset.tags) ? asset.tags : []
    }));

  const registry = getUniversalAssetRegistryState();

  return {
    schemaVersion: 'v1',
    registry: {
      schemaVersion: registry?.schemaVersion || 'v2',
      registryVersion: Number(registry?.registryVersion || 1),
      contractCount: Number(registry?.entries?.length || 0)
    },
    assetIds: ids,
    resolvedAssets,
    unresolvedAssetIds: ids.filter((id) => !resolvedAssets.some((entry) => entry.assetId === id))
  };
}

function toAssetPlanFromDiscovery(profile = {}) {
  const selected = Array.isArray(profile?.decision?.selectedAssets) ? profile.decision.selectedAssets : [];
  if (!selected.length) return [];

  return selected.map((entry, index) => ({
    assetId: String(entry?.assetId || `procedural-${index + 1}`),
    assetRef: {
      registryAssetId: String(entry?.assetId || `procedural-${index + 1}`),
      registryVersion: String(entry?.version || 'latest')
    },
    label: String(entry?.metadata?.name || entry?.assetId || `Asset ${index + 1}`),
    category: String(entry?.category || 'General'),
    icon: String(entry?.category || 'General'),
    focus: String(entry?.reason || 'adaptive-match'),
    lod: String(entry?.lodLevel || 'medium'),
    qualityLevel: String(entry?.qualityLevel || 'medium'),
    compression: {
      enabled: true,
      level: String(entry?.qualityLevel || 'medium') === 'high' ? 'balanced' : 'aggressive'
    },
    lazyLoading: {
      enabled: true,
      preloadDistance: String(entry?.lodLevel || 'medium') === 'high' ? 6 : 3
    },
    optimization: {
      culling: true,
      instancing: String(entry?.lodLevel || 'medium') !== 'high',
      batchSize: String(entry?.lodLevel || 'medium') === 'high' ? 24 : 12
    },
    rankScore: Number(entry?.rankScore || 0)
  }));
}

function applyAdaptiveFallbackActions(scene = {}, profile = {}) {
  const actions = new Set(Array.isArray(profile?.fallbackPlan?.actions) ? profile.fallbackPlan.actions : []);
  const next = {
    ...scene,
    classification: {
      ...(scene?.classification || {})
    },
    metadata: {
      ...(scene?.metadata || {})
    }
  };

  if (actions.has('downgrade-visualization-complexity')) {
    next.classification.sceneComplexity = 'low';
    next.metadata.fallbackVisualizationComplexity = 'low';
  }

  if (actions.has('switch-adaptive-2d-visualization')) {
    next.classification.renderMode = 'abstract';
    next.metadata.visualizationMode = 'adaptive-2d';
    next.metadata.visualizationFallbackMode = '2d-adaptive';
  }

  if (actions.has('switch-procedural-generation')) {
    next.metadata.forceProceduralGeneration = true;
  }

  return next;
}

async function attachVisualizationCapabilityMetadata(scene, normalizedInput, config, options = {}) {
  if (!scene || typeof scene !== 'object') return scene;

  const performanceLimits = getPerformanceLimits(config.performanceProfile);

  const resolved = resolveVisualizationCapabilities({
    normalizedLesson: {
      id: normalizedInput.id,
      title: normalizedInput.title,
      topic: normalizedInput.topic
    },
    classification: normalizedInput.classification,
    concepts: normalizedInput.concepts?.length ? normalizedInput.concepts : scene.objects,
    relationships: scene.relationships || [],
    steps: normalizedInput.steps?.length ? normalizedInput.steps : scene.timeline,
    goals: normalizedInput.goals,
    examples: normalizedInput.examples,
    learnerContext: normalizedInput.learnerContext,
    accessibilityPreferences: {
      textAlternativeRequired: true,
      keyboardCompatible: true,
      reducedMotionCompatible: true,
      highContrastCompatible: true
    },
    performanceProfile: config.performanceProfile,
    sceneMetadata: scene.metadata || {}
  }, {
    registry: options.visualizationCapabilityRegistry
  });

  const templateContext = {
    sceneId: scene.sceneId,
    lessonId: normalizedInput.id,
    classification: normalizedInput.classification,
    visualizationRequirements: resolved.visualizationRequirements,
    selectedCapabilities: resolved.selectedCapabilities,
    capabilityComposition: resolved.capabilityComposition,
    concepts: scene.objects || [],
    relationships: scene.relationships || [],
    timelineRequirements: scene.timeline || [],
    interactionRequirements: scene.interactions || [],
    accessibilityNeeds: resolved.visualizationRequirements?.accessibilityNeeds || {},
    performanceProfile: config.performanceProfile,
    metadata: scene.metadata || {}
  };

  const recommendation = analyzeCapabilityTemplateRecommendation({
    learningIntent: normalizedInput.classification?.intentProfile || normalizedInput.metadata?.intentProfile || null,
    visualizationStrategy: normalizedInput.visualizationStrategy,
    sceneGraph: {
      sceneId: scene.sceneId,
      nodeCount: Array.isArray(scene.objects) ? scene.objects.length : 0,
      relationshipCount: Array.isArray(scene.relationships) ? scene.relationships.length : 0
    },
    runtimeGraph: {
      interactionCount: Array.isArray(scene.interactions) ? scene.interactions.length : 0,
      timelineStepCount: Array.isArray(scene.timeline) ? scene.timeline.length : 0
    },
    timeline: {
      events: Array.isArray(scene.timeline) ? scene.timeline : []
    },
    lessonMetadata: {
      id: normalizedInput.id,
      lessonId: normalizedInput.id,
      title: normalizedInput.title,
      topic: normalizedInput.topic,
      performanceProfile: config.performanceProfile,
      source: normalizedInput.source,
      learnerContext: normalizedInput.learnerContext || {}
    },
    concepts: scene.objects || normalizedInput.concepts || [],
    relationships: scene.relationships || [],
    steps: scene.timeline || normalizedInput.steps || [],
    goals: normalizedInput.goals || [],
    examples: normalizedInput.examples || [],
    interactions: scene.interactions || []
  }, {
    capabilityRegistry: options.visualizationCapabilityRegistry,
    templateRegistry: options.visualizationTemplateRegistry,
    minimumTemplateScore: options.minimumTemplateScore,
    maxTemplateResults: options.maxTemplateResults,
    maxTemplateRecommendations: options.maxTemplateResults
  });

  const selection = selectVisualizationTemplate(templateContext, {
    registry: options.visualizationTemplateRegistry,
    minimumScore: options.minimumTemplateScore ?? 0.2,
    maxResults: options.maxTemplateResults ?? 8
  });

  const preObjectConfidenceProfile = analyzeUniversalConfidenceConflictFallback({
    learningIntent: normalizedInput.classification?.intentProfile || normalizedInput.metadata?.intentProfile || null,
    visualizationStrategy: normalizedInput.visualizationStrategy,
    templateRecommendation: recommendation,
    sceneGraph: {
      sceneId: scene.sceneId,
      nodeCount: Array.isArray(scene.objects) ? scene.objects.length : 0,
      relationshipCount: Array.isArray(scene.relationships) ? scene.relationships.length : 0
    },
    timeline: scene.timeline || [],
    runtimeGraph: {
      nodeCount: Array.isArray(scene.objects) ? scene.objects.length : 0,
      relationshipCount: Array.isArray(scene.relationships) ? scene.relationships.length : 0
    },
    aiConfidenceMetadata: buildAiConfidenceMetadata(scene, selection, recommendation),
    scene
  }, {
    minimumConfidenceThreshold: options.minimumConfidenceThreshold ?? 0.45
  });

  const recommendedFallbackActions = Array.isArray(preObjectConfidenceProfile?.fallbackPlan?.actions)
    ? preObjectConfidenceProfile.fallbackPlan.actions
    : [];

  const generationDecision = shouldGenerateTemplateFromRecommendation(selection, recommendation, options);
  const shouldForceGenerationFromConfidence = recommendedFallbackActions.includes('switch-procedural-generation')
    || recommendedFallbackActions.includes('retry-pipeline');

  const adaptedScene = applyAdaptiveFallbackActions(scene, preObjectConfidenceProfile);
  const adaptedTemplateContext = {
    ...templateContext,
    metadata: {
      ...(templateContext.metadata || {}),
      confidenceConflictFallback: preObjectConfidenceProfile
    }
  };

  let generated = null;

  if (generationDecision.generate || shouldForceGenerationFromConfidence) {
    const alternateTemplate = recommendedFallbackActions.includes('select-alternate-template')
      ? recommendation?.recommendedTemplates?.[1] || recommendation?.recommendedTemplates?.[0] || null
      : null;

    const alternateSelectedTemplate = alternateTemplate
      ? {
        ...(selection.selectedTemplate || {}),
        templateId: alternateTemplate.templateId || selection?.selectedTemplate?.templateId,
        version: alternateTemplate.version || selection?.selectedTemplate?.version
      }
      : selection.selectedTemplate;

    generated = await generateVisualizationTemplate({
      ...adaptedTemplateContext,
      preferredTemplate: alternateSelectedTemplate,
      failedTemplateSelection: selection,
      metadata: {
        ...(adaptedTemplateContext.metadata || {}),
        confidence: Number(selection.confidence || 0.6)
      }
    }, {
      signal: options.signal,
      forceGenerate: options.forceTemplateGeneration === true || shouldForceGenerationFromConfidence,
      useCache: options.useTemplateGenerationCache !== false,
      registerGeneratedTemplate: options.registerGeneratedTemplate !== false,
      qualityThreshold: options.minimumTemplateQuality ?? 65,
      refinementPasses: options.templateRefinementPasses ?? 2,
      performanceProfile: config.performanceProfile,
      maximumSlots: options.maximumTemplateSlots,
      maximumRegions: options.maximumTemplateRegions,
      maximumRelationships: options.maximumTemplateRelationships,
      deterministicSeed: normalizedInput.id || normalizedInput.topic || scene.sceneId,
      fallbackEnabled: options.templateFallbackEnabled !== false,
      registry: options.visualizationTemplateRegistry
    });
  }

  const selectedTemplate = generated?.template || selection.selectedTemplate;
  const selectedTemplateInstance = generated?.templateInstance || selection.selectedTemplateInstance;
  const selectedBindings = generated?.bindings || selection.bindings;
  const selectedDiagnostics = generated?.diagnostics || selection.diagnostics;
  const selectedComposition = selection.templateComposition;

  const objectGeneration = await generateEducationalObjects({
    sceneId: scene.sceneId,
    lessonId: normalizedInput.id,
    lesson: {
      id: normalizedInput.id,
      title: normalizedInput.title,
      topic: normalizedInput.topic,
      content: normalizedInput.content
    },
    classification: {
      ...(normalizedInput.classification || {}),
      sceneComplexity: adaptedScene?.classification?.sceneComplexity || normalizedInput?.classification?.sceneComplexity
    },
    visualizationRequirements: resolved.visualizationRequirements,
    selectedCapabilities: resolved.selectedCapabilities,
    capabilityComposition: resolved.capabilityComposition,
    template: selectedTemplate,
    templateInstance: selectedTemplateInstance,
    slotBindings: selectedBindings?.slots?.bindings || selectedBindings?.slots || [],
    regionBindings: selectedBindings?.regions?.bindings || selectedBindings?.regions || [],
    concepts: scene.objects || [],
    relationships: scene.relationships || [],
    orderedSteps: scene.timeline || [],
    learningGoals: normalizedInput.goals || [],
    examples: normalizedInput.examples || [],
    timelineRequirements: scene.timeline || [],
    interactionRequirements: scene.interactions || [],
    accessibilityNeeds: resolved.visualizationRequirements?.accessibilityNeeds || {},
    performanceProfile: config.performanceProfile,
    runtimeCapabilities: {
      supportsWebGL: true,
      logicalCores: options.logicalCores || undefined,
      deviceMemoryGb: options.deviceMemoryGb || undefined
    },
    sceneConstraints: {
      complexityBudget: {
        maxObjects: Number(performanceLimits.maxObjects || 50),
        maxTemplateComplexity: Number(options.maxTemplateComplexity || 80)
      }
    },
    metadata: {
      ...(adaptedScene.metadata || scene.metadata || {}),
      confidenceConflictFallback: preObjectConfidenceProfile
    }
  }, {
    signal: options.signal,
    useCache: options.useObjectGenerationCache !== false,
    forceGenerate: options.forceObjectGeneration === true,
    deterministicSeed: normalizedInput.id || normalizedInput.topic || scene.sceneId,
    qualityThreshold: options.minimumObjectQuality ?? 65,
    refinementPasses: options.objectRefinementPasses ?? 2,
    maximumObjects: Number(performanceLimits.maxObjects || 50),
    performanceProfile: config.performanceProfile,
    fallbackEnabled: options.objectFallbackEnabled !== false
  });

  const finalConfidenceProfile = analyzeUniversalConfidenceConflictFallback({
    learningIntent: normalizedInput.classification?.intentProfile || normalizedInput.metadata?.intentProfile || null,
    visualizationStrategy: normalizedInput.visualizationStrategy,
    templateRecommendation: recommendation,
    sceneGraph: {
      sceneId: adaptedScene.sceneId,
      nodeCount: Array.isArray(adaptedScene.objects) ? adaptedScene.objects.length : 0,
      relationshipCount: Array.isArray(adaptedScene.relationships) ? adaptedScene.relationships.length : 0
    },
    timeline: adaptedScene.timeline || [],
    runtimeGraph: {
      nodeCount: Array.isArray(adaptedScene.objects) ? adaptedScene.objects.length : 0,
      relationshipCount: Array.isArray(adaptedScene.relationships) ? adaptedScene.relationships.length : 0
    },
    aiConfidenceMetadata: buildAiConfidenceMetadata(adaptedScene, selection, recommendation),
    scene: {
      ...adaptedScene,
      educationalObjects: objectGeneration.objects || adaptedScene.educationalObjects || []
    }
  }, {
    minimumConfidenceThreshold: options.minimumConfidenceThreshold ?? 0.45
  });

  const assetDiscoveryProfile = analyzeUniversalAssetDiscoveryMatchingResolution({
    learningIntent: normalizedInput.classification?.intentProfile || normalizedInput.metadata?.intentProfile || {
      learningIntent: normalizedInput.title,
      educationalStrategy: normalizedInput.classification?.educationalStrategy,
      reasoningStyle: normalizedInput.classification?.reasoningStyle,
      confidenceScore: normalizedInput.classification?.confidence
    },
    visualizationStrategy: normalizedInput.visualizationStrategy,
    capabilityRecommendation: recommendation,
    sceneGraph: {
      nodeCount: Array.isArray(adaptedScene.objects) ? adaptedScene.objects.length : 0,
      relationshipCount: Array.isArray(adaptedScene.relationships) ? adaptedScene.relationships.length : 0,
      metadata: {
        sceneId: adaptedScene.sceneId,
        title: adaptedScene.title
      }
    },
    runtimeGraph: {
      nodeCount: Array.isArray(adaptedScene.objects) ? adaptedScene.objects.length : 0,
      relationshipCount: Array.isArray(adaptedScene.relationships) ? adaptedScene.relationships.length : 0
    },
    sceneMetadata: adaptedScene.metadata || {},
    objectMetadata: (adaptedScene.objects || []).map((object) => ({
      id: object.id,
      name: object.name || object.label,
      category: object.type || object.category,
      tags: object.tags || [],
      metadata: object.metadata || {}
    })),
    performanceProfile: config.performanceProfile
  }, {
    performanceProfile: config.performanceProfile
  });

  const discoveredAssetPlan = toAssetPlanFromDiscovery(assetDiscoveryProfile);
  const hasSceneAssetPlan = Array.isArray(adaptedScene.assetPlan) && adaptedScene.assetPlan.length > 0;
  const mergedAssetPlan = hasSceneAssetPlan ? adaptedScene.assetPlan : discoveredAssetPlan;
  const mergedReusableAssets = mergedAssetPlan.map((entry) => entry?.assetId).filter(Boolean);

  const assetRegistryMetadata = buildAssetRegistrySceneMetadata(adaptedScene, objectGeneration);

  return {
    ...adaptedScene,
    assetPlan: mergedAssetPlan,
    reusableAssets: mergedReusableAssets,
    educationalObjects: objectGeneration.objects || scene.educationalObjects || [],
    educationalObjectInstances: objectGeneration.objectInstances || scene.educationalObjectInstances || [],
    metadata: {
      ...(adaptedScene.metadata && typeof adaptedScene.metadata === 'object' ? adaptedScene.metadata : {}),
      visualizationStrategy: normalizedInput.visualizationStrategy,
      visualizationCapabilities: {
        visualizationRequirements: resolved.visualizationRequirements,
        selectedCapabilities: resolved.selectedCapabilities,
        capabilityComposition: resolved.capabilityComposition,
        diagnostics: resolved.diagnostics
      },
      visualizationRequirements: resolved.visualizationRequirements,
      selectedCapabilities: resolved.selectedCapabilities,
      capabilityComposition: resolved.capabilityComposition,
      templateSelection: summarizeTemplateSelection(selection),
      capabilityTemplateRecommendation: summarizeCapabilityTemplateRecommendation(recommendation),
      templateGeneration: generated ? summarizeTemplateGeneration(generated) : null,
      confidenceConflictFallback: finalConfidenceProfile,
      selectedTemplate: selectedTemplate,
      selectedTemplateInstance: selectedTemplateInstance,
      templateComposition: selectedComposition,
      templateBindings: selectedBindings,
      visualizationTemplate: selectedTemplate,
      visualizationTemplateInstance: selectedTemplateInstance,
      templateDiagnostics: selectedDiagnostics,
      assetDiscovery: assetDiscoveryProfile,
      assetRegistry: assetRegistryMetadata,
      recommendationDrivenDecision: {
        ...generationDecision,
        confidenceScore: Number(recommendation?.confidenceScore || 0)
      },
      adaptiveFallbackDecision: {
        reason: finalConfidenceProfile?.fallbackPlan?.reason || preObjectConfidenceProfile?.fallbackPlan?.reason || 'confidence-acceptable',
        actions: finalConfidenceProfile?.fallbackPlan?.actions || preObjectConfidenceProfile?.fallbackPlan?.actions || [],
        overallConfidence: Number(finalConfidenceProfile?.overallConfidence || preObjectConfidenceProfile?.overallConfidence || 0),
        minimumConfidenceThreshold: Number(options.minimumConfidenceThreshold ?? 0.45),
        preserveLearningQuality: finalConfidenceProfile?.fallbackPlan?.preserveLearningQuality !== false
      },
      generatedEducationalObjects: objectGeneration.objects || [],
      educationalObjectGeneration: {
        status: objectGeneration.status,
        source: objectGeneration.source,
        fallbackLevel: Number(objectGeneration.fallbackLevel || 0),
        fallbackUsed: objectGeneration.fallbackUsed === true,
        cacheHit: objectGeneration.cacheHit === true,
        deduplicated: objectGeneration.deduplicated === true,
        quality: objectGeneration.quality || null,
        diagnostics: objectGeneration.diagnostics || null,
        warnings: minimalWarnings(objectGeneration.warnings || []),
        errors: minimalWarnings(objectGeneration.errors || [])
      }
    }
  };
}

function attachBehaviorMetadata(scene, options = {}) {
  return ensureSceneEducationalObjectBehaviorMetadata(scene, {
    includeDefaultObjectBehavior: options.includeDefaultObjectBehavior !== false
  });
}

export async function generateUniversalScene(input = {}, options = {}) {
  const config = normalizeSceneGenerationConfig(options);
  const performanceLimits = getPerformanceLimits(config.performanceProfile);
  const includeDevDiagnostics = Boolean(options?.devMode);
  const totalStart = beginTimedStage();

  const normalizedInput = normalizeInput(input);
  const contentFingerprint = stableHash(JSON.stringify(normalizedInput.content));
  const classificationFingerprint = stableHash(JSON.stringify(normalizedInput.classification || {}));
  const generationKey = createGenerationGuardKey({
    lessonId: normalizedInput.id,
    topic: normalizedInput.topic,
    fingerprint: contentFingerprint,
    difficulty: normalizedInput.difficulty,
    classification: classificationFingerprint,
    schemaVersion: config.schemaVersion,
    model: options.model || config.model || 'auto',
    locale: options.locale || config.locale
  });

  const diagnostics = createSceneGenerationDiagnostics({
    generationKey,
    provider: typeof options.provider === 'string' ? options.provider : (options.provider?.id || config.provider),
    model: options.model || config.model || null
  });
  diagnostics.inputLength = JSON.stringify(input || {}).length;

  addSceneGenerationEvent(diagnostics, 'scene_generation_started', {
    lessonId: normalizedInput.id,
    profile: config.performanceProfile
  });

  if (options.signal?.aborted) {
    diagnostics.cancelled = true;
    finalizeSceneGenerationDiagnostics(diagnostics, totalStart);
    addSceneGenerationEvent(diagnostics, 'scene_generation_cancelled', { early: true });
    return createCancelledResult(diagnostics, includeDevDiagnostics);
  }

  const run = async () => {
    const cacheKey = `v${config.schemaVersion}:${generationKey}`;
    diagnostics.cacheKey = cacheKey;

    try {
      if (config.useCache && options.useCache !== false && !options.forceRegenerate) {
        const stage = beginTimedStage();
        const cachedEntry = sceneGenerationCache.validateCachedScene(sceneGenerationCache.get(cacheKey));
        markSceneGenerationTiming(diagnostics, 'normalizationDuration', endTimedStage(stage));
        if (cachedEntry?.scene) {
          const sceneWithCapabilities = await attachVisualizationCapabilityMetadata(cachedEntry.scene, normalizedInput, config, options);
          const sceneWithBehavior = attachBehaviorMetadata(sceneWithCapabilities, options);
          const artifacts = await buildSceneArtifacts(sceneWithBehavior, performanceLimits, diagnostics);
          diagnostics.cacheHit = true;
          addSceneGenerationEvent(diagnostics, 'scene_cache_hit', { cacheKey });
          finalizeSceneGenerationDiagnostics(diagnostics, totalStart);
          return buildSuccessResult({
            status: 'success',
            source: 'cache',
            scene: artifacts.scene,
            runtimeScene: artifacts.runtimeScene,
            rendererPayload: artifacts.rendererPayload,
            diagnostics,
            warnings: minimalWarnings(cachedEntry.warnings),
            fallbackUsed: false,
            cacheHit: true,
            includeDev: includeDevDiagnostics
          });
        }
      }

      const promptStage = beginTimedStage();
      const prompt = buildScenePlanningPrompt(normalizedInput, config);
      diagnostics.promptLength = prompt.promptLength;
      diagnostics.compactedInputLength = prompt.compactedInputLength;
      markSceneGenerationTiming(diagnostics, 'normalizationDuration', endTimedStage(promptStage));

      if (!config.useAI || options.useAI === false) {
        addSceneGenerationWarning(diagnostics, 'AI generation disabled. Using deterministic fallback.');
        const fallbackScene = generateFallbackScene(normalizedInput, { performanceLimits }, {
          level: 3,
          reason: 'ai-disabled'
        });
        const fallbackWithCapabilities = await attachVisualizationCapabilityMetadata(fallbackScene, normalizedInput, config, options);
        const fallbackWithBehavior = attachBehaviorMetadata(fallbackWithCapabilities, options);
        const artifacts = await buildSceneArtifacts(fallbackWithBehavior, performanceLimits, diagnostics);
        diagnostics.fallbackLevel = 3;
        diagnostics.fallbackReason = 'ai-disabled';
        addSceneGenerationEvent(diagnostics, 'scene_fallback_completed', { level: 3 });
        finalizeSceneGenerationDiagnostics(diagnostics, totalStart);
        return buildSuccessResult({
          status: 'fallback',
          source: 'fallback',
          scene: artifacts.scene,
          runtimeScene: artifacts.runtimeScene,
          rendererPayload: artifacts.rendererPayload,
          diagnostics,
          warnings: ['AI scene generation was unavailable, so an adaptive local scene was created.'],
          fallbackUsed: true,
          cacheHit: false,
          includeDev: includeDevDiagnostics
        });
      }

      addSceneGenerationEvent(diagnostics, 'scene_provider_request_started', {
        provider: diagnostics.provider
      });

      const providerResponse = await runWithSceneRetries(async (attempt) => {
        diagnostics.attemptCount = attempt + 1;
        const response = await requestScenePlanFromProvider({
          messages: prompt.messages
        }, {
          provider: options.provider,
          model: options.model || config.model,
          maxOutputTokens: config.maxOutputTokens,
          timeoutMs: options.timeoutMs || config.timeoutMs,
          signal: options.signal
        });
        return response;
      }, {
        maxRetries: options.maxRetries ?? config.maxRetries,
        signal: options.signal,
        baseDelayMs: 260
      }, diagnostics);

      diagnostics.provider = providerResponse.provider || diagnostics.provider;
      diagnostics.model = providerResponse.model || diagnostics.model;
      diagnostics.outputLength = String(providerResponse.text || '').length;
      if (includeDevDiagnostics) {
        diagnostics.development.rawProviderResponse = {
          provider: providerResponse.provider,
          model: providerResponse.model,
          textPreview: String(providerResponse.text || '').slice(0, 800)
        };
      }

      addSceneGenerationEvent(diagnostics, 'scene_provider_request_completed', {
        provider: diagnostics.provider,
        model: diagnostics.model
      });

      const parseStage = beginTimedStage();
      const parsed = parseSceneResponse(providerResponse, {
        sourceType: normalizedInput.source,
        fallbackTitle: normalizedInput.title,
        fallbackSubject: normalizedInput.topic
      });
      diagnostics.candidateCount = parsed.candidateCount;
      diagnostics.selectedCandidateScore = parsed.selectedCandidateScore;
      markSceneGenerationTiming(diagnostics, 'validationDuration', endTimedStage(parseStage));
      addSceneGenerationEvent(diagnostics, 'scene_response_parsed', {
        candidates: parsed.candidateCount,
        score: parsed.selectedCandidateScore
      });

      let scene = parsed.scene;
      let status = scene?.validation?.status === 'repaired' ? 'repaired' : 'success';
      let source = 'ai';
      let fallbackUsed = false;

      diagnostics.classificationConfidence = Number(scene?.classification?.confidence || 0);
      diagnostics.sceneConfidence = Number(scene?.metadata?.confidence || diagnostics.classificationConfidence || 0);

      if (!scene || typeof scene !== 'object') {
        throw new SceneGenerationError({
          code: 'SCENE_VALIDATION_FAILED',
          stage: 'scene-process',
          retryable: false,
          message: 'Scene pipeline produced invalid result.',
          safeMessage: 'Scene generation did not produce a valid scene.'
        });
      }

      if (scene?.validation?.status === 'fallback') {
        addSceneGenerationWarning(diagnostics, 'AI response required fallback after scene validation.');
        const fallbackScene = generateFallbackScene(normalizedInput, { performanceLimits }, {
          level: 2,
          reason: 'validation-fallback',
          partialScene: scene
        });
        scene = fallbackScene;
        status = 'fallback';
        source = 'fallback';
        fallbackUsed = true;
        diagnostics.fallbackLevel = 2;
        diagnostics.fallbackReason = 'validation-fallback';
      }

      const sceneWithCapabilities = await attachVisualizationCapabilityMetadata(scene, normalizedInput, config, options);
      const sceneWithBehavior = attachBehaviorMetadata(sceneWithCapabilities, options);
      const artifacts = await buildSceneArtifacts(sceneWithBehavior, performanceLimits, diagnostics);

      if (config.useCache && options.useCache !== false && !fallbackUsed) {
        const cachePayload = {
          lessonId: normalizedInput.id,
          scene: artifacts.scene,
          schemaVersion: config.schemaVersion,
          contentFingerprint,
          modelMetadata: {
            provider: diagnostics.provider,
            model: diagnostics.model
          },
          classificationFingerprint,
          diagnosticsSummary: {
            candidateCount: diagnostics.candidateCount,
            selectedCandidateScore: diagnostics.selectedCandidateScore,
            attemptCount: diagnostics.attemptCount,
            retryCount: diagnostics.retryCount,
            totalDuration: diagnostics.totalDuration
          },
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 1000 * 60 * 30).toISOString(),
          warnings: diagnostics.warnings
        };
        sceneGenerationCache.set(cacheKey, cachePayload);
      }

      addSceneGenerationEvent(diagnostics, 'scene_build_completed', {
        nodeCount: artifacts.runtimeScene?.graph?.getNodeCount?.() || 0
      });

      finalizeSceneGenerationDiagnostics(diagnostics, totalStart);
      addSceneGenerationEvent(diagnostics, 'scene_generation_completed', {
        status,
        fallbackUsed
      });

      return buildSuccessResult({
        status,
        source,
        scene: artifacts.scene,
        runtimeScene: artifacts.runtimeScene,
        rendererPayload: artifacts.rendererPayload,
        diagnostics,
        warnings: minimalWarnings(diagnostics.warnings),
        fallbackUsed,
        cacheHit: false,
        includeDev: includeDevDiagnostics
      });
    } catch (error) {
      const normalizedError = toSceneGenerationError(error, { stage: error?.stage || 'pipeline' });

      if (normalizedError.code === 'REQUEST_TIMEOUT') {
        diagnostics.timedOut = true;
      }

      if (isAbortError(normalizedError)) {
        diagnostics.cancelled = true;
        addSceneGenerationEvent(diagnostics, 'scene_generation_cancelled', {});
        finalizeSceneGenerationDiagnostics(diagnostics, totalStart);
        return createCancelledResult(diagnostics, includeDevDiagnostics);
      }

      addSceneGenerationError(diagnostics, normalizedError.safeMessage || normalizedError.message);
      addSceneGenerationEvent(diagnostics, 'scene_generation_failed', {
        code: normalizedError.code,
        stage: normalizedError.stage
      });

      if (!config.fallbackEnabled) {
        finalizeSceneGenerationDiagnostics(diagnostics, totalStart);
        return buildSuccessResult({
          status: 'failed',
          source: 'error',
          scene: null,
          runtimeScene: null,
          rendererPayload: null,
          diagnostics,
          warnings: [normalizedError.safeMessage],
          fallbackUsed: false,
          cacheHit: false,
          includeDev: includeDevDiagnostics
        });
      }

      const fallbackLevel = normalizedError.code === 'PROVIDER_CREDITS_UNAVAILABLE' ? 3 : 4;
      const fallbackScene = generateFallbackScene(normalizedInput, { performanceLimits }, {
        level: fallbackLevel,
        reason: normalizedError.code
      });
      const fallbackWithCapabilities = await attachVisualizationCapabilityMetadata(fallbackScene, normalizedInput, config, options);
      const fallbackWithBehavior = attachBehaviorMetadata(fallbackWithCapabilities, options);
      const artifacts = await buildSceneArtifacts(fallbackWithBehavior, performanceLimits, diagnostics);
      diagnostics.fallbackLevel = fallbackLevel;
      diagnostics.fallbackReason = normalizedError.code;

      addSceneGenerationEvent(diagnostics, 'scene_fallback_started', {
        level: fallbackLevel,
        reason: normalizedError.code
      });
      addSceneGenerationEvent(diagnostics, 'scene_fallback_completed', {
        level: fallbackLevel
      });

      finalizeSceneGenerationDiagnostics(diagnostics, totalStart);
      return buildSuccessResult({
        status: 'fallback',
        source: 'fallback',
        scene: artifacts.scene,
        runtimeScene: artifacts.runtimeScene,
        rendererPayload: artifacts.rendererPayload,
        diagnostics,
        warnings: ['AI scene generation was unavailable, so an adaptive local scene was created.'],
        fallbackUsed: true,
        cacheHit: false,
        includeDev: includeDevDiagnostics
      });
    }
  };

  try {
    return await runGuardedGeneration(generationKey, options.signal, run);
  } catch (error) {
    const normalizedError = toSceneGenerationError(error);
    if (normalizedError.code === 'REQUEST_CANCELLED') {
      diagnostics.cancelled = true;
      finalizeSceneGenerationDiagnostics(diagnostics, totalStart);
      return createCancelledResult(diagnostics, includeDevDiagnostics);
    }

    addSceneGenerationError(diagnostics, normalizedError.safeMessage);
    finalizeSceneGenerationDiagnostics(diagnostics, totalStart);
    return buildSuccessResult({
      status: 'failed',
      source: 'error',
      scene: null,
      runtimeScene: null,
      rendererPayload: null,
      diagnostics,
      warnings: [normalizedError.safeMessage],
      fallbackUsed: false,
      cacheHit: false,
      includeDev: includeDevDiagnostics
    });
  }
}
