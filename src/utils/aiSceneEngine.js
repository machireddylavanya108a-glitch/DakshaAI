import { createAssetManager, resolveAssetFromRegistry } from './assetManager.js';
import { buildAnimationPlan, buildAutoAnimationState } from './aiAnimationEngine.js';
import { processSceneJsonPipeline } from '../scene-generator/SceneVersionManager.js';
import { loadScene } from '../scene-builder/SceneRuntime.js';
import { analyzeUniversalLearningIntent } from '../intent-analysis/index.js';
import { analyzeVisualizationStrategy } from '../visualization-strategy/index.js';

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'to', 'of', 'for', 'on', 'in', 'with', 'from', 'by', 'at', 'as', 'into', 'about',
  'show', 'explain', 'learn', 'teaching', 'lesson', 'chapter', 'topic', 'understand', 'overview', 'introduction'
]);

function toTitleCase(value = '') {
  return String(value || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function pickTopTerms(content = '', limit = 8) {
  const words = String(content || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word));

  const counts = new Map();
  words.forEach((word) => counts.set(word, (counts.get(word) || 0) + 1));
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([word]) => word);
}

function deriveInteractionCategory(terms = [], subDomain = 'Open Topic') {
  const actionSeed = terms.find((token) => /ing$|ed$|ize$|ify$/.test(token)) || terms[0] || 'explore';
  return `${toTitleCase(actionSeed)} Interaction`;
}

function deriveVisualizationStyle(terms = [], subDomain = 'Open Topic') {
  const anchor = terms.slice(0, 2).map((token) => toTitleCase(token)).join(' ').trim();
  if (anchor) return `${anchor} Knowledge Space`;
  return `${toTitleCase(subDomain)} Adaptive Space`;
}

function inferComplexity(content = '', terms = [], rankedAssets = []) {
  const textLength = String(content || '').trim().length;
  const uniqueTerms = new Set(terms).size;
  const assetDensity = rankedAssets.filter((item) => (item?.rankScore || 0) > 0).length;
  const score = textLength / 160 + uniqueTerms * 0.6 + assetDensity * 1.1;
  if (score >= 9) return 'high';
  if (score >= 5) return 'medium';
  return 'low';
}

function deriveRenderMode(content = '', rankedAssets = []) {
  const topScore = Number(rankedAssets?.[0]?.rankScore || 0);
  const tokenCount = String(content || '').trim().split(/\s+/).filter(Boolean).length;
  if (topScore >= 2 && tokenCount >= 5) return 'spatial';
  return 'abstract';
}

function buildClassificationFallback() {
  return {
    domain: 'Custom',
    subDomain: 'Open Topic',
    visualization: 'Adaptive',
    sceneComplexity: 'medium',
    objectCategory: 'Dynamic',
    animationCategory: 'Guided Motion',
    interactionCategory: 'Generic Exploration',
    interaction: 'Generic Exploration'
  };
}

function colorFromSeed(seed = '') {
  const source = String(seed || 'dynamic');
  let hash = 0;
  for (let index = 0; index < source.length; index += 1) {
    hash = ((hash << 5) - hash + source.charCodeAt(index)) | 0;
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue} 72% 58%)`;
}

function toVector3(value, fallback) {
  if (Array.isArray(value) && value.length === 3) {
    const numbers = value.map((item) => Number(item));
    if (numbers.every((item) => Number.isFinite(item))) return numbers;
  }
  return fallback;
}

function getRuntimeNodes(runtimeScene, predicate) {
  const nodes = runtimeScene?.graph?.toJSON?.()?.nodes;
  if (!Array.isArray(nodes)) return [];
  return nodes.filter((node) => predicate(node));
}

function materializeRenderObjects(runtimeScene, fallbackObjects = []) {
  const objectNodes = getRuntimeNodes(runtimeScene, (node) => {
    const sourceKey = String(node?.metadata?.sourceKey || '').toLowerCase();
    const kind = String(node?.kind || '').toLowerCase();
    return sourceKey === 'objects' || kind === 'object';
  });

  if (!objectNodes.length) return fallbackObjects;

  return objectNodes.map((node, index) => {
    const raw = node?.properties || {};
    const metadata = raw?.metadata && typeof raw.metadata === 'object' ? raw.metadata : {};
    const details = raw?.properties && typeof raw.properties === 'object' ? raw.properties : {};
    const fallbackLabel = `Object ${index + 1}`;
    const label = raw.name || raw.label || fallbackLabel;
    const category = raw.type || metadata.category || node.kind || 'dynamic';
    return {
      id: node.id,
      label,
      category,
      asset: metadata.asset || raw.asset || 'concept-node',
      color: details.color || colorFromSeed(category),
      position: toVector3(raw.position, [index * 1.2, 0, 0]),
      size: toVector3(raw.scale || raw.size, [0.95, 0.95, 0.95]),
      facts: Array.isArray(details.facts) && details.facts.length
        ? details.facts
        : [`${label} is a dynamic scene concept.`]
    };
  });
}

function materializeLabels(runtimeScene, renderObjects = []) {
  const objectById = new Map(renderObjects.map((item) => [item.id, item]));
  const labelNodes = getRuntimeNodes(runtimeScene, (node) => String(node?.metadata?.sourceKey || '').toLowerCase() === 'labels');
  if (!labelNodes.length) {
    return renderObjects.map((item) => ({ id: item.id, text: item.label, position: item.position }));
  }

  return labelNodes.map((node, index) => {
    const raw = node?.properties || {};
    const target = objectById.get(raw.targetObjectId);
    return {
      id: node.id,
      text: raw.text || target?.label || `Label ${index + 1}`,
      position: target?.position || [0, 0, 0]
    };
  });
}

function materializeHotspots(runtimeScene, renderObjects = []) {
  const objectById = new Map(renderObjects.map((item) => [item.id, item]));
  const interactionNodes = getRuntimeNodes(runtimeScene, (node) => String(node?.metadata?.sourceKey || '').toLowerCase() === 'interactions');
  if (!interactionNodes.length) {
    return renderObjects.map((item, index) => ({
      id: `hotspot-${index + 1}`,
      label: item.label,
      details: item.facts,
      position: item.position
    }));
  }

  return interactionNodes.map((node, index) => {
    const raw = node?.properties || {};
    const target = objectById.get(raw.targetObjectId);
    return {
      id: node.id,
      label: raw.label || target?.label || `Hotspot ${index + 1}`,
      details: Array.isArray(raw.details) && raw.details.length ? raw.details : (target?.facts || []),
      position: target?.position || [0, 0, 0]
    };
  });
}

function materializeTimeline(runtimeScene, fallbackTimeline = []) {
  const timelineNodes = getRuntimeNodes(runtimeScene, (node) => String(node?.metadata?.sourceKey || '').toLowerCase() === 'timeline');
  if (!timelineNodes.length) return fallbackTimeline;

  return timelineNodes.map((node, index) => {
    const raw = node?.properties || {};
    return {
      id: node.id,
      title: raw.title || `Step ${index + 1}`,
      cameraMode: raw?.camera?.movement?.mode || 'orbit',
      durationMs: Number(raw.duration || 0),
      replay: true
    };
  });
}

function buildRendererPayloadFromRuntimeScene(runtimeScene, fallbacks = {}) {
  const baseObjects = Array.isArray(fallbacks.objects) ? fallbacks.objects : [];
  const baseTimeline = Array.isArray(fallbacks.timeline) ? fallbacks.timeline : [];
  const objects = materializeRenderObjects(runtimeScene, baseObjects);
  const labels = materializeLabels(runtimeScene, objects);
  const hotspots = materializeHotspots(runtimeScene, objects);
  const timeline = materializeTimeline(runtimeScene, baseTimeline);
  const models = objects.map((object, index) => {
    const resolvedAsset = resolveAssetFromRegistry(object.asset || '', 'latest');
    return {
      id: `model-${index + 1}`,
      label: object.label,
      assetId: resolvedAsset?.id || object.asset,
      category: object.category,
      position: object.position,
      size: object.size,
      color: object.color,
      assetRef: {
        registryAssetId: resolvedAsset?.id || object.asset || null,
        registryVersion: resolvedAsset?.version || 'latest',
        source: resolvedAsset?.source || 'registry'
      }
    };
  });

  return {
    objects,
    labels,
    hotspots,
    timeline,
    models
  };
}

export function classifyUniversalSubject(content = '', sourceType = 'typed-topic') {
  const normalizedContent = String(content || '').trim();
  const manager = createAssetManager();
  const rankedAssets = manager.rankAssets(normalizedContent, '');
  const topAsset = rankedAssets[0] || null;
  const topTerms = pickTopTerms(normalizedContent, 10);

  if (!normalizedContent) {
    return buildClassificationFallback();
  }

  const intent = analyzeUniversalLearningIntent({
    sourceType,
    content: normalizedContent
  });
  const strategyProfile = analyzeVisualizationStrategy({
    sourceType,
    content: normalizedContent,
    intent
  });
  const strategy = strategyProfile.primaryStrategy;

  const semanticAnchor = topTerms.slice(0, 2).join(' ');
  const inferredDomain = intent.knowledgeDomain
    ? toTitleCase(intent.knowledgeDomain)
    : topAsset?.category
      ? toTitleCase(topAsset.category)
      : topTerms[0]
        ? toTitleCase(topTerms[0])
        : 'Custom';

  const inferredSubDomain = intent.subDomain
    ? toTitleCase(intent.subDomain)
    : topAsset?.name
      ? toTitleCase(topAsset.name)
      : semanticAnchor
        ? toTitleCase(semanticAnchor)
        : `${toTitleCase(sourceType || 'topic')} Focus`;

  const visualization = strategy?.visualizationStyle || (intent.visualizationComplexity === 'high'
    ? `${deriveVisualizationStyle(topTerms, inferredSubDomain)} Layered`
    : deriveVisualizationStyle(topTerms, inferredSubDomain));
  const interactionCategory = deriveInteractionCategory(topTerms, inferredSubDomain);
  const sceneComplexity = strategy?.sceneComplexity || intent.interactionComplexity || inferComplexity(normalizedContent, topTerms, rankedAssets);
  const renderMode = deriveRenderMode(normalizedContent, rankedAssets);
  const objectCategory = inferredDomain === 'Custom' ? 'Dynamic' : inferredDomain;

  return {
    domain: inferredDomain,
    subDomain: inferredSubDomain,
    visualization,
    sceneComplexity,
    renderMode,
    objectCategory,
    animationCategory: strategy?.animationIntensity || (sceneComplexity === 'high' ? 'Layered Motion' : 'Guided Motion'),
    interactionCategory,
    interaction: interactionCategory,
    learningIntent: intent.learningIntent,
    educationalStrategy: intent.educationalStrategy,
    reasoningStyle: intent.reasoningStyle,
    intentConfidence: intent.confidenceScore,
    visualizationStrategy: strategyProfile,
    renderingPriority: strategy?.renderingPriority || 'balanced',
    cameraStrategy: strategy?.cameraStrategy || 'adaptive-context-camera',
    narrationStrategy: strategy?.narrationStrategy || 'concept-first narration',
    timelineStrategy: strategy?.timelineStrategy || 'checkpoint-driven',
    simulationRequirements: strategy?.simulationRequirements || { required: false, mode: 'not-required', parameters: { supportsUnknownStates: true } }
  };
}

function tokenizeConcepts(content = '') {
  const normalized = String(content || '').toLowerCase();
  const candidates = normalized.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
  const unique = [...new Set(candidates)].slice(0, 10);
  return unique.length ? unique : ['concept'];
}

function chooseEntities(content = '', domain = 'General') {
  const concepts = tokenizeConcepts(content);
  const baseEntities = concepts.slice(0, 5).map((concept, index) => ({
    name: concept.replace(/^./, (char) => char.toUpperCase()),
    category: domain,
    role: index === 0 ? 'anchor' : 'support',
    concept
  }));

  if (baseEntities.length < 3) {
    baseEntities.push({ name: 'Core Process', category: domain, role: 'focus', concept: 'process' });
  }

  return baseEntities;
}

function buildAssetPlan(content = '', domain = 'General', entities = []) {
  const manager = createAssetManager();
  const assets = manager.buildAssetPlan(content, domain);
  const selected = assets.slice(0, Math.min(3, Math.max(1, entities.length)));

  return selected.map((asset, index) => ({
    assetId: asset.assetId || asset.id,
    assetRef: {
      registryAssetId: asset.assetId || asset.id,
      registryVersion: asset.version || 'latest'
    },
    label: asset.label || asset.name,
    category: asset.category,
    icon: asset.icon || asset.category,
    focus: entities[index]?.name || 'core concept',
    lod: asset.lod,
    compression: asset.compression,
    lazyLoading: asset.lazyLoading,
    optimization: asset.optimization,
    compositePlan: asset.compositePlan || null,
    rankScore: asset.rankScore || 0
  }));
}

export function buildSceneBlueprint(content = '', sourceType = 'typed-topic') {
  const classification = classifyUniversalSubject(content, sourceType);
  const domain = classification.domain || 'Custom';
  const entities = chooseEntities(content, classification.objectCategory || domain);
  const assetPlan = buildAssetPlan(content, classification.objectCategory || domain, entities);
  const fallbackEntities = entities.length ? entities : [
    { name: 'Core concept', category: classification.objectCategory, role: 'focus', concept: 'concept' },
    { name: 'Practice loop', category: classification.objectCategory, role: 'support', concept: 'practice' },
    { name: 'Review step', category: classification.objectCategory, role: 'support', concept: 'review' }
  ];
  const safeAssetPlan = assetPlan.length ? assetPlan : fallbackEntities.map((entity, index) => ({
    assetId: `fallback-${index + 1}`,
    label: `${entity.name} asset`,
    category: entity.category,
    icon: '🧩',
    focus: entity.name,
    lod: 'medium',
    compression: 'balanced',
    lazyLoading: { enabled: true, preloadDistance: 4 },
    optimization: 'fallback',
    compositePlan: null,
    rankScore: 1
  }));

  return {
    domain,
    subDomain: classification.subDomain,
    classification,
    sourceType,
    concepts: tokenizeConcepts(content),
    entities: fallbackEntities,
    assetPlan: safeAssetPlan,
    summary: `A ${classification.visualization.toLowerCase()} was generated for ${classification.subDomain} under ${domain}.`,
    sceneTitle: `${classification.subDomain} learning scene`
  };
}

export function buildSceneFromBlueprint(blueprint) {
  const entities = blueprint?.entities || [];
  const assetPlan = blueprint?.assetPlan || [];
  const objects = entities.map((entity, index) => ({
    label: entity.name,
    category: entity.category,
    asset: assetPlan[index]?.assetId || 'concept-node',
    assetMeta: assetPlan[index] || null,
    color: ['#34d399', '#60a5fa', '#f59e0b', '#f472b6', '#a78bfa'][index % 5],
    position: [index * 1.2 - (entities.length - 1) * 0.6, 0, 0],
    size: [0.95, 0.95, 0.95],
    facts: [
      `${entity.name} represents a major concept in this lesson.`,
      `${entity.category} assets were auto-selected for the scene.`,
      `The scene is built dynamically from the lesson content.`
    ]
  }));

  const classification = blueprint?.classification || buildClassificationFallback();
  const summary = `${blueprint?.summary || 'Dynamic scene'} It adapts to ${classification.subDomain || blueprint?.domain || 'the lesson'} and uses ${assetPlan.length} auto-selected assets with ${classification.interactionCategory || 'guided exploration'}.`;

  const rawScene = {
    title: blueprint?.sceneTitle || 'AI scene',
    subject: blueprint?.subDomain || blueprint?.domain || 'General Learning',
    classification,
    objects: objects.map((item, index) => ({
      id: `obj-${index + 1}`,
      type: item.category || 'generic',
      name: item.label || `Object ${index + 1}`,
      position: item.position,
      rotation: [0, 0, 0],
      scale: item.size,
      visible: true,
      enabled: true,
      interactive: true,
      highlightable: true,
      clickable: true,
      animationIds: [],
      labelIds: [],
      metadata: {
        category: item.category,
        asset: item.asset
      },
      state: {},
      properties: {
        color: item.color,
        facts: item.facts
      },
      extensions: {
        assetMeta: item.assetMeta || null
      }
    })),
    labels: objects.map((item, index) => ({
      id: `label-${index + 1}`,
      text: item.label,
      targetObjectId: `obj-${index + 1}`
    })),
    interactions: objects.map((item, index) => ({
      id: `interaction-${index + 1}`,
      label: item.label,
      details: item.facts,
      targetObjectId: `obj-${index + 1}`
    })),
    timeline: [],
    animations: [],
    summary,
    assetPlan,
    reusableAssets: assetPlan.map((item) => item.assetId).filter(Boolean),
    lessonFocus: blueprint?.concepts?.[0] || 'concept',
    domain: blueprint?.domain || 'Custom',
    subDomain: blueprint?.subDomain || classification.subDomain,
    category: blueprint?.domain || 'Custom',
    supports3D: true,
    fallbackType: '3d',
    hotspots: objects.map((item) => ({ label: item.label, category: item.category, details: item.facts }))
  };

  const processedScene = processSceneJsonPipeline(rawScene, {
    sourceType: blueprint?.sourceType || 'typed-topic',
    fallbackTitle: blueprint?.sceneTitle || 'Safe Scene',
    fallbackSubject: blueprint?.domain || 'General Learning'
  });
  const runtimeScene = loadScene(processedScene);
  const rendererPayload = buildRendererPayloadFromRuntimeScene(runtimeScene, {
    objects,
    timeline: []
  });

  return {
    ...processedScene,
    runtimeSceneGraph: runtimeScene.graph.toJSON(),
    runtimeDiagnostics: runtimeScene.diagnostics,
    title: blueprint?.sceneTitle || 'AI scene',
    category: blueprint?.domain || 'Custom',
    supports3D: true,
    fallbackType: '3d',
    rendererPayload,
    objects: rendererPayload.objects,
    labels: rendererPayload.labels.map((item) => item.text),
    hotspots: rendererPayload.hotspots,
    summary,
    assetPlan,
    reusableAssets: assetPlan.map((item) => item.assetId).filter(Boolean),
    lessonFocus: blueprint?.concepts?.[0] || 'concept',
    domain: blueprint?.domain || 'Custom',
    subDomain: blueprint?.subDomain || classification.subDomain,
    classification
  };
}

export function buildAuto3DSceneForLesson(content = '', sourceType = 'typed-topic') {
  const normalizedContent = String(content || '').toLowerCase();
  const classification = classifyUniversalSubject(content, sourceType);
  const shouldUseNon3DVisual = classification.renderMode === 'abstract';

  if (shouldUseNon3DVisual) {
    const visualizationType = String(classification.visualization || 'adaptive')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'adaptive';

    const rawScene = {
      title: `${classification.subDomain} visualization`,
      subject: classification.subDomain,
      classification,
      domain: classification.domain,
      subDomain: classification.subDomain,
      supports3D: false,
      timeline: [],
      objects: [],
      animations: [],
      labels: [],
      interactions: [],
      summary: `An adaptive visualization was prepared for ${classification.subDomain}.`,
      assetPlan: [],
      reusableAssets: []
    };

    const processedScene = processSceneJsonPipeline(rawScene, {
      sourceType,
      fallbackTitle: 'Safe Scene',
      fallbackSubject: classification.domain || 'General Learning'
    });
    const runtimeScene = loadScene(processedScene);

    return {
      ...processedScene,
      runtimeSceneGraph: runtimeScene.graph.toJSON(),
      runtimeDiagnostics: runtimeScene.diagnostics,
      shouldAutoGenerate: true,
      title: `${classification.subDomain} visualization`,
      domain: classification.domain,
      subDomain: classification.subDomain,
      classification,
      supports3D: false,
      visualizationType,
      models: [],
      labels: [],
      animations: [],
      hotspots: [],
      measurements: [],
      crossSections: [],
      xRay: [],
      explodedView: [],
      timeline: [],
      replay: false,
      autoAnimationState: {
        steps: [],
        currentStep: 0
      },
      summary: `An adaptive visualization was prepared for ${classification.subDomain}.`,
      assetPlan: [],
      reusableAssets: [],
      assetIntelligence: {
        strategy: visualizationType,
        requiresComposition: false,
        compositePlan: null,
        diagramFallback: true,
        animationFallback: false
      }
    };
  }

  const blueprint = buildSceneBlueprint(content, sourceType);
  const scene = buildSceneFromBlueprint(blueprint);
  const animationPlan = buildAnimationPlan(content, scene.objects);
  const autoAnimationState = buildAutoAnimationState(content);

  const models = scene.rendererPayload?.models || scene.objects.map((object, index) => ({
    id: `model-${index + 1}`,
    label: object.label,
    assetId: object.asset,
    category: object.category,
    position: object.position,
    size: object.size,
    color: object.color
  }));
  const labels = (scene.rendererPayload?.labels || models.map((model) => ({ id: model.id, text: model.label, position: model.position })))
    .map((label, index) => ({
      id: models[index]?.id || label.id,
      text: label.text,
      position: models[index]?.position || label.position || [0, 0, 0]
    }));
  const hotspots = (scene.rendererPayload?.hotspots || []).map((hotspot, index) => ({
    id: hotspot.id || `hotspot-${index + 1}`,
    label: hotspot.label,
    details: hotspot.details,
    position: models[index]?.position || hotspot.position || [0, 0, 0]
  }));
  const measurements = models.map((model, index) => ({
    id: `measurement-${index + 1}`,
    target: model.id,
    value: `${index + 1} unit`,
    unit: 'u'
  }));
  const interactionHint = String(scene?.classification?.interactionCategory || '').toLowerCase();
  const crossSections = /(cross\s*section|inside view|slice)/.test(normalizedContent) || /interaction/.test(interactionHint)
    ? [{ id: 'cross-section-1', label: 'Cross Section', target: models[0]?.id || 'model-1' }]
    : [];
  const xRay = /(x-ray|xray|transparent view)/.test(normalizedContent)
    ? [{ id: 'xray-1', label: 'X-Ray View', target: models[0]?.id || 'model-1' }]
    : [];
  const explodedView = /(explode|breakdown|layers|assembly|cross\s*section|x-ray|xray)/.test(normalizedContent)
    ? [{ id: 'explode-1', label: 'Exploded View', target: models[0]?.id || 'model-1' }]
    : [];
  const timeline = animationPlan.map((step, index) => ({
    id: step.id,
    title: step.title,
    cameraMode: step.cameraMode,
    durationMs: step.durationMs,
    replay: step.replay
  }));

  const rawScene = {
    title: scene.title,
    subject: scene.subDomain || scene.domain || 'General Learning',
    classification: scene.classification,
    domain: scene.domain,
    subDomain: scene.subDomain,
    supports3D: true,
    objects: scene.objects,
    labels,
    interactions: hotspots,
    timeline,
    animations: animationPlan,
    summary: scene.summary,
    assetPlan: scene.assetPlan,
    reusableAssets: scene.reusableAssets
  };

  const processedScene = processSceneJsonPipeline(rawScene, {
    sourceType,
    fallbackTitle: scene.title || 'Safe Scene',
    fallbackSubject: scene.domain || 'General Learning'
  });
  const runtimeScene = loadScene(processedScene);
  const rendererPayload = buildRendererPayloadFromRuntimeScene(runtimeScene, {
    objects: scene.objects,
    timeline
  });

  return {
    ...processedScene,
    runtimeSceneGraph: runtimeScene.graph.toJSON(),
    runtimeDiagnostics: runtimeScene.diagnostics,
    shouldAutoGenerate: true,
    title: scene.title,
    domain: scene.domain,
    subDomain: scene.subDomain,
    classification: scene.classification,
    rendererPayload,
    models: rendererPayload.models,
    labels: rendererPayload.labels,
    animations: animationPlan,
    hotspots: rendererPayload.hotspots,
    measurements,
    crossSections,
    xRay,
    explodedView,
    timeline: rendererPayload.timeline,
    replay: true,
    autoAnimationState,
    summary: scene.summary,
    assetPlan: scene.assetPlan,
    reusableAssets: scene.reusableAssets,
    assetIntelligence: {
      strategy: scene.assetPlan?.[0]?.compositePlan?.strategy || 'single-asset',
      requiresComposition: Boolean(scene.assetPlan?.[0]?.compositePlan?.secondary || scene.assetPlan?.[0]?.rankScore < 2),
      compositePlan: scene.assetPlan?.[0]?.compositePlan || null,
      diagramFallback: classification.renderMode === 'abstract',
      animationFallback: /(animate|motion|rotate|walk|step)/.test(normalizedContent)
    }
  };
}
