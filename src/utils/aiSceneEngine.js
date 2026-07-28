import { createAssetManager } from './assetManager.js';
import { buildAnimationPlan, buildAutoAnimationState } from './aiAnimationEngine.js';

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'to', 'of', 'for', 'on', 'in', 'with', 'from', 'by', 'at', 'as', 'into', 'about',
  'show', 'explain', 'learn', 'teaching', 'lesson', 'chapter', 'topic', 'understand', 'overview', 'introduction'
]);

const ACTION_SIGNALS = {
  inspection: ['inspect', 'examine', 'analyze', 'observe', 'compare', 'diagnose'],
  process: ['process', 'pipeline', 'flow', 'sequence', 'step', 'workflow'],
  construction: ['build', 'construct', 'assemble', 'design', 'draft', 'model'],
  simulation: ['simulate', 'predict', 'optimize', 'experiment', 'test', 'train'],
  exploration: ['explore', 'discover', 'navigate', 'tour', 'walkthrough', 'investigate']
};

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

function inferInteractionCategory(content = '', terms = []) {
  const text = `${content} ${terms.join(' ')}`.toLowerCase();
  const scored = Object.entries(ACTION_SIGNALS)
    .map(([key, words]) => ({
      key,
      score: words.reduce((acc, word) => (text.includes(word) ? acc + 1 : acc), 0)
    }))
    .sort((a, b) => b.score - a.score);

  if (scored[0]?.score <= 0) return 'Generic Exploration';
  if (scored[0].key === 'inspection') return 'Interactive Inspection';
  if (scored[0].key === 'process') return 'Process Walkthrough';
  if (scored[0].key === 'construction') return 'Build And Breakdown';
  if (scored[0].key === 'simulation') return 'Scenario Simulation';
  return 'Guided Exploration';
}

function inferVisualizationStyle(content = '', terms = [], topAsset = null) {
  const text = String(content || '').toLowerCase();
  const signature = [topAsset?.name, topAsset?.category, ...terms.slice(0, 2)].filter(Boolean).join(' ');

  if (/timeline|history|chronolog/.test(text)) return 'Timeline Visualization';
  if (/chart|graph|metric|trend/.test(text)) return 'Analytical Chart Scene';
  if (/diagram|workflow|pipeline|map|architecture/.test(text)) return 'System Diagram Scene';
  if (/studio|lab|kitchen|classroom|court|factory/.test(text)) return 'Immersive Environment Scene';
  if (signature) return `${toTitleCase(signature)} Visualization`;
  return 'Adaptive Visualization';
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

export function classifyUniversalSubject(content = '', sourceType = 'typed-topic') {
  const normalizedContent = String(content || '').trim();
  const manager = createAssetManager();
  const rankedAssets = manager.rankAssets(normalizedContent, '');
  const topAsset = rankedAssets[0] || null;
  const topTerms = pickTopTerms(normalizedContent, 10);

  if (!normalizedContent) {
    return buildClassificationFallback();
  }

  const semanticAnchor = topTerms.slice(0, 2).join(' ');
  const inferredDomain = topAsset?.category
    ? toTitleCase(topAsset.category)
    : topTerms[0]
      ? toTitleCase(topTerms[0])
      : 'Custom';

  const inferredSubDomain = topAsset?.name
    ? toTitleCase(topAsset.name)
    : semanticAnchor
      ? toTitleCase(semanticAnchor)
      : `${toTitleCase(sourceType || 'topic')} Focus`;

  const visualization = inferVisualizationStyle(normalizedContent, topTerms, topAsset);
  const interactionCategory = inferInteractionCategory(normalizedContent, topTerms);
  const sceneComplexity = inferComplexity(normalizedContent, topTerms, rankedAssets);
  const objectCategory = inferredDomain === 'Custom' ? 'Dynamic' : inferredDomain;

  return {
    domain: inferredDomain,
    subDomain: inferredSubDomain,
    visualization,
    sceneComplexity,
    objectCategory,
    animationCategory: sceneComplexity === 'high' ? 'Layered Motion' : 'Guided Motion',
    interactionCategory,
    interaction: interactionCategory
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
  const domainLabel = String(classification?.domain || blueprint?.domain || 'Custom').toLowerCase();
  const summary = `${blueprint?.summary || 'Dynamic scene'} It adapts to ${classification.subDomain || blueprint?.domain || 'the lesson'} and uses ${assetPlan.length} auto-selected assets with ${classification.interactionCategory || 'guided exploration'}.`;

  return {
    title: blueprint?.sceneTitle || 'AI scene',
    category: blueprint?.domain || 'Custom',
    supports3D: true,
    fallbackType: '3d',
    objects,
    labels: objects.map((item) => item.label),
    hotspots: objects.map((item) => ({ label: item.label, category: item.category, details: item.facts })),
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
  const visualizationStyle = String(classification.visualization || '').toLowerCase();
  const shouldUseNon3DVisual = /chart|timeline|diagram|map/.test(visualizationStyle)
    || /timeline|chart|diagram|map/.test(normalizedContent);

  if (shouldUseNon3DVisual) {
    const visualizationType = /timeline/.test(visualizationStyle) || /timeline/.test(normalizedContent)
      ? 'timeline'
      : /chart|graph/.test(visualizationStyle) || /chart|graph/.test(normalizedContent)
        ? 'chart'
        : /diagram|map|workflow|pipeline/.test(visualizationStyle) || /workflow|pipeline|diagram|map/.test(normalizedContent)
          ? 'diagram'
          : 'concept-map';

    return {
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
      summary: `A ${visualizationType} visualization was prepared for ${classification.subDomain}.`,
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

  const models = scene.objects.map((object, index) => ({
    id: `model-${index + 1}`,
    label: object.label,
    assetId: object.asset,
    category: object.category,
    position: object.position,
    size: object.size,
    color: object.color
  }));

  const labels = models.map((model) => ({ id: model.id, text: model.label, position: model.position }));
  const hotspots = scene.hotspots.map((hotspot, index) => ({
    id: `hotspot-${index + 1}`,
    label: hotspot.label,
    details: hotspot.details,
    position: models[index]?.position || [0, 0, 0]
  }));
  const measurements = models.map((model, index) => ({
    id: `measurement-${index + 1}`,
    target: model.id,
    value: `${index + 1} unit`,
    unit: 'u'
  }));
  const interactionHint = String(scene?.classification?.interactionCategory || '').toLowerCase();
  const crossSections = /cross\s*section/.test(normalizedContent) || /inspection/.test(interactionHint)
    ? [{ id: 'cross-section-1', label: 'Cross Section', target: models[0]?.id || 'model-1' }]
    : [];
  const xRay = /x-ray|xray/.test(normalizedContent) || /inspection/.test(interactionHint)
    ? [{ id: 'xray-1', label: 'X-Ray View', target: models[0]?.id || 'model-1' }]
    : [];
  const explodedView = /explode|assembly|breakdown|cross\s*section|x-ray|xray/.test(normalizedContent) || /build and breakdown|inspection/.test(interactionHint)
    ? [{ id: 'explode-1', label: 'Exploded View', target: models[0]?.id || 'model-1' }]
    : [];
  const timeline = animationPlan.map((step, index) => ({
    id: step.id,
    title: step.title,
    cameraMode: step.cameraMode,
    durationMs: step.durationMs,
    replay: step.replay
  }));

  return {
    shouldAutoGenerate: true,
    title: scene.title,
    domain: scene.domain,
    subDomain: scene.subDomain,
    classification: scene.classification,
    models,
    labels,
    animations: animationPlan,
    hotspots,
    measurements,
    crossSections,
    xRay,
    explodedView,
    timeline,
    replay: true,
    autoAnimationState,
    summary: scene.summary,
    assetPlan: scene.assetPlan,
    reusableAssets: scene.reusableAssets,
    assetIntelligence: {
      strategy: scene.assetPlan?.[0]?.compositePlan?.strategy || 'single-asset',
      requiresComposition: Boolean(scene.assetPlan?.[0]?.compositePlan?.secondary || scene.assetPlan?.[0]?.rankScore < 2),
      compositePlan: scene.assetPlan?.[0]?.compositePlan || null,
      diagramFallback: Boolean(/diagram|flow|map|process|network|system|chart|timeline/.test(normalizedContent)),
      animationFallback: Boolean(/animate|motion|flow|orbit|rotate|explode|walk|step/.test(normalizedContent))
    }
  };
}
