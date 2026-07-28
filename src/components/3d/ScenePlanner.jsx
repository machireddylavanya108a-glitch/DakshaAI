import { buildSceneBlueprint, buildSceneFromBlueprint } from '../../utils/aiSceneEngine.js';

function buildCameraCues(entities = []) {
  return entities.map((entity, index) => ({
    stepId: `camera-step-${index + 1}`,
    target: entity.name,
    action: index % 2 === 0 ? 'orbit-focus' : 'zoom-focus',
    durationMs: 1800 + index * 250
  }));
}

function buildTimeline(entities = []) {
  return entities.map((entity, index) => ({
    id: `timeline-${index + 1}`,
    title: `Explore ${entity.name}`,
    objective: `Understand ${entity.name} and its role in the lesson.`,
    target: entity.name,
    animation: index % 2 === 0 ? 'highlight-pulse' : 'motion-cycle',
    durationMs: 1600 + index * 200
  }));
}

export function planSceneFromLesson({ content = '', sourceType = 'typed-topic', lessonContext = '' } = {}) {
  const mergedContent = `${content || ''} ${lessonContext || ''}`.trim();
  const blueprint = buildSceneBlueprint(mergedContent, sourceType);
  const sceneJson = buildSceneFromBlueprint(blueprint);
  const entities = (sceneJson.objects || []).map((entity, index) => ({
    name: entity.name || entity.label || `Entity ${index + 1}`,
    category: entity.type || entity.category || 'Dynamic',
    tags: [entity.name || entity.label || 'concept', String(entity.type || entity.category || 'dynamic').toLowerCase()]
  }));

  const sceneTitle = mergedContent
    ? `${mergedContent.slice(0, 80)}${mergedContent.length > 80 ? '...' : ''}`
    : 'Automatic Learning Scene';

  const timeline = buildTimeline(entities);
  const cameraCues = buildCameraCues(entities);

  return {
    sceneTitle,
    sourceType,
    subject: blueprint.domain,
    classification: blueprint.classification,
    sceneJson,
    entities,
    timeline,
    cameraCues,
    animationTargets: entities.map((entity) => entity.name),
    simulationMode: blueprint.domain,
    assessment: {
      tasks: entities.slice(0, 4).map((entity, index) => `Task ${index + 1}: Identify ${entity.name}`)
    },
    practiceMode: {
      tasks: entities.slice(0, 4).map((entity, index) => `Practice ${index + 1}: Interact with ${entity.name}`)
    },
    syncCues: entities.map((entity, index) => ({
      cue: `Now look at ${entity.name}.`,
      target: entity.name,
      timelineStep: index
    })),
    summary: blueprint.summary,
    assetPlan: blueprint.assetPlan,
    domain: blueprint.domain
  };
}
