import { createSafeScene, generateSceneScopedId } from './SceneSchema.js';
import { processSceneJsonPipeline } from './SceneVersionManager.js';

function unique(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function normalizeText(value = '') {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function extractConcepts(normalizedInput = {}, maxConcepts = 8) {
  const direct = [];
  if (Array.isArray(normalizedInput.concepts)) {
    direct.push(...normalizedInput.concepts.map((item) => normalizeText(item)));
  }
  if (Array.isArray(normalizedInput.steps)) {
    direct.push(...normalizedInput.steps.map((item) => normalizeText(item).split(/[.:,-]/)[0]));
  }
  if (Array.isArray(normalizedInput.goals)) {
    direct.push(...normalizedInput.goals.map((item) => normalizeText(item).split(/[.:,-]/)[0]));
  }

  const content = Array.isArray(normalizedInput.content)
    ? normalizedInput.content.join(' ')
    : normalizeText(normalizedInput.content);

  const terms = content
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 3)
    .slice(0, 200);

  const inferred = terms.slice(0, maxConcepts).map((term) => term.replace(/^./, (char) => char.toUpperCase()));
  const merged = unique([...direct, ...inferred]).slice(0, maxConcepts);
  return merged.length ? merged : ['Core Concept'];
}

function buildClassification(normalizedInput = {}) {
  const base = normalizedInput.classification && typeof normalizedInput.classification === 'object'
    ? normalizedInput.classification
    : {};

  return {
    domain: base.domain || 'Custom',
    subDomain: base.subDomain || normalizeText(normalizedInput.topic || normalizedInput.title || 'Open Topic') || 'Open Topic',
    visualization: base.visualization || 'Adaptive Knowledge Space',
    sceneComplexity: base.sceneComplexity || 'medium',
    objectCategory: base.objectCategory || 'Dynamic Educational Object',
    animationCategory: base.animationCategory || 'Guided Motion',
    interactionCategory: base.interactionCategory || 'Concept Exploration',
    interaction: base.interaction || base.interactionCategory || 'Concept Exploration',
    confidence: Number(base.confidence || 0.55),
    metadata: {
      ...(base.metadata && typeof base.metadata === 'object' ? base.metadata : {}),
      fallback: true
    }
  };
}

function buildStructuredScene(normalizedInput = {}, config = {}, level = 3, reason = 'fallback', partial = {}) {
  const concepts = extractConcepts(normalizedInput, level === 4 ? 1 : 8);
  const maxObjects = config?.performanceLimits?.maxObjects || 50;
  const maxSteps = config?.performanceLimits?.maxTimelineSteps || 16;
  const clippedConcepts = concepts.slice(0, Math.max(1, Math.min(maxObjects, maxSteps, concepts.length)));
  const classification = buildClassification(normalizedInput);

  const objects = clippedConcepts.map((concept, index) => ({
    id: generateSceneScopedId('obj'),
    type: 'concept-node',
    name: concept,
    position: [index * 1.3 - ((clippedConcepts.length - 1) * 0.65), 0, 0],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    visible: true,
    enabled: true,
    interactive: true,
    highlightable: true,
    clickable: true,
    animationIds: [],
    labelIds: [],
    metadata: {
      concept,
      fallbackCapability: index % 2 === 0 ? 'process-step' : 'relationship-edge'
    },
    state: {},
    properties: {
      summary: `${concept} supports the lesson objective.`
    },
    extensions: {}
  }));

  const labels = objects.map((object) => ({
    id: generateSceneScopedId('label'),
    text: object.name,
    targetObjectId: object.id
  }));

  const interactions = objects.map((object) => ({
    id: generateSceneScopedId('interaction'),
    label: `Inspect ${object.name}`,
    details: [`Understand ${object.name} in this lesson context.`],
    targetObjectId: object.id
  }));

  const timeline = objects.slice(0, maxSteps).map((object, index) => ({
    id: generateSceneScopedId('step'),
    order: index,
    title: `Explore ${object.name}`,
    description: `Focus on ${object.name} and relate it to the lesson goals.`,
    duration: 1200,
    camera: {
      movement: {
        mode: 'orbit',
        speed: 1
      },
      targetObjectId: object.id
    },
    objects: [object.id],
    animations: [],
    narration: {
      text: `${object.name} is an important part of this lesson.`
    },
    interaction: {
      type: 'inspect',
      targetObjectId: object.id
    },
    completionRule: {
      type: 'manual',
      value: null
    }
  }));

  const checkpoints = timeline.map((step, index) => ({
    id: generateSceneScopedId('checkpoint'),
    title: `Checkpoint ${index + 1}`,
    prompt: `Explain ${step.title.toLowerCase()} in one sentence.`
  }));

  const scene = createSafeScene({
    title: normalizedInput.title || normalizedInput.topic || 'Adaptive Learning Scene',
    subject: normalizedInput.topic || normalizedInput.title || 'General Learning',
    classification,
    objects,
    labels,
    interactions,
    timeline,
    animations: objects.map((object, index) => ({
      id: generateSceneScopedId('anim'),
      targetObjectId: object.id,
      type: 'highlight',
      duration: 900 + index * 60
    })),
    narration: {
      enabled: true,
      language: normalizedInput?.metadata?.locale || 'en',
      text: `This adaptive scene presents ${clippedConcepts.length} core concept${clippedConcepts.length > 1 ? 's' : ''}.`,
      segments: timeline.map((step) => ({ id: generateSceneScopedId('segment'), text: step.description })),
      links: timeline.map((step) => ({ stepId: step.id }))
    },
    checkpoints,
    metadata: {
      source: level >= 3 ? 'deterministic-fallback' : 'ai-salvage-fallback',
      sourceType: normalizedInput.source || 'unknown',
      fallbackLevel: level,
      fallbackReason: reason,
      lessonId: normalizedInput.id || null,
      topic: normalizedInput.topic || normalizedInput.title || 'Open Topic',
      confidence: classification.confidence
    }
  });

  const merged = partial && typeof partial === 'object'
    ? {
        ...scene,
        ...partial,
        metadata: {
          ...scene.metadata,
          ...(partial.metadata || {})
        },
        classification: {
          ...scene.classification,
          ...(partial.classification || {})
        }
      }
    : scene;

  return processSceneJsonPipeline(merged, {
    sourceType: 'fallback',
    fallbackTitle: scene.title,
    fallbackSubject: scene.subject
  });
}

export function generateFallbackScene(input, config, options = {}) {
  const level = Number(options.level || 3);
  const reason = options.reason || 'fallback';
  const partial = options.partialScene || {};

  if (level <= 1 && partial && typeof partial === 'object') {
    return processSceneJsonPipeline(partial, {
      sourceType: 'fallback-repair',
      fallbackTitle: input?.title || 'Fallback Scene',
      fallbackSubject: input?.topic || 'General Learning'
    });
  }

  if (level === 2) {
    return buildStructuredScene(input, config, 2, reason, partial);
  }

  if (level === 4) {
    return buildStructuredScene(input, config, 4, reason, {});
  }

  return buildStructuredScene(input, config, 3, reason, partial);
}
