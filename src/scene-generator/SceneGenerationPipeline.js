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
import {
  selectVisualizationTemplate
} from '../visualization-templates/index.js';

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
  const labelNodes = nodes.filter((node) => String(node?.metadata?.sourceKey || '').toLowerCase() === 'labels');
  const interactionNodes = nodes.filter((node) => String(node?.metadata?.sourceKey || '').toLowerCase() === 'interactions');
  const timelineNodes = nodes.filter((node) => String(node?.metadata?.sourceKey || '').toLowerCase() === 'timeline');

  const maxObjects = Math.max(1, Number(performanceLimits?.maxObjects || 50));
  const clippedObjectNodes = objectNodes.slice(0, maxObjects);

  const objects = clippedObjectNodes.map((node, index) => {
    const raw = node?.properties || {};
    const info = raw?.properties || {};
    return {
      id: node.id,
      label: raw.name || `Object ${index + 1}`,
      category: raw.type || raw?.metadata?.category || 'dynamic',
      position: Array.isArray(raw.position) ? raw.position : [index, 0, 0],
      size: Array.isArray(raw.scale) ? raw.scale : [1, 1, 1],
      color: info.color || '#34d399',
      facts: Array.isArray(info.facts) ? info.facts.slice(0, 3) : []
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

function attachVisualizationCapabilityMetadata(scene, normalizedInput, config, options = {}) {
  if (!scene || typeof scene !== 'object') return scene;

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

  const selection = selectVisualizationTemplate(templateContext, {
    registry: options.visualizationTemplateRegistry,
    minimumScore: options.minimumTemplateScore ?? 0.2,
    maxResults: options.maxTemplateResults ?? 8
  });

  return {
    ...scene,
    metadata: {
      ...(scene.metadata && typeof scene.metadata === 'object' ? scene.metadata : {}),
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
      selectedTemplate: selection.selectedTemplate,
      selectedTemplateInstance: selection.selectedTemplateInstance,
      templateComposition: selection.templateComposition,
      templateBindings: selection.bindings,
      visualizationTemplate: selection.selectedTemplate,
      visualizationTemplateInstance: selection.selectedTemplateInstance,
      templateDiagnostics: selection.diagnostics
    }
  };
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
          const sceneWithCapabilities = attachVisualizationCapabilityMetadata(cachedEntry.scene, normalizedInput, config, options);
          const artifacts = await buildSceneArtifacts(sceneWithCapabilities, performanceLimits, diagnostics);
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
        const fallbackWithCapabilities = attachVisualizationCapabilityMetadata(fallbackScene, normalizedInput, config, options);
        const artifacts = await buildSceneArtifacts(fallbackWithCapabilities, performanceLimits, diagnostics);
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

      const sceneWithCapabilities = attachVisualizationCapabilityMetadata(scene, normalizedInput, config, options);
      const artifacts = await buildSceneArtifacts(sceneWithCapabilities, performanceLimits, diagnostics);

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
      const fallbackWithCapabilities = attachVisualizationCapabilityMetadata(fallbackScene, normalizedInput, config, options);
      const artifacts = await buildSceneArtifacts(fallbackWithCapabilities, performanceLimits, diagnostics);
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
