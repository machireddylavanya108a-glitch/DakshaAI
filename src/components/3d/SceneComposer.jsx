import { createAssetManager } from '../../utils/assetManager.js';

function colorFromCategory(category = '') {
  const source = String(category || 'dynamic');
  let hash = 0;
  for (let index = 0; index < source.length; index += 1) {
    hash = ((hash << 5) - hash + source.charCodeAt(index)) | 0;
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue} 72% 58%)`;
}

function chooseAsset(category = 'General Objects') {
  const manager = createAssetManager();
  const categoryAssets = manager.getAssetsByCategory(category);
  const asset = categoryAssets[0] || manager.getAllAssets()[0] || null;
  return asset?.id || 'dynamic-asset';
}

function makePosition(index, total) {
  const columns = Math.min(4, Math.max(1, Math.ceil(Math.sqrt(total))));
  const row = Math.floor(index / columns);
  const col = index % columns;
  const xOffset = (columns - 1) * 1.2;
  return [col * 2.4 - xOffset, 0.2 + row * 0.3, row * -1.8];
}

export function composeSceneFromPlan(plan) {
  const entities = plan?.entities || [];
  const assetPlan = Array.isArray(plan?.assetPlan) ? plan.assetPlan : [];
  const objects = entities.map((entity, index) => ({
    id: `obj-${index + 1}`,
    label: entity.name,
    category: entity.category,
    asset: assetPlan[index]?.assetId || chooseAsset(entity.category),
    color: colorFromCategory(entity.category),
    position: makePosition(index, entities.length),
    size: [1 + (index % 2) * 0.2, 1, 1],
    annotations: [
      `${entity.name} is part of ${plan.subject}.`,
      `Used in ${plan.sourceType} based lesson visualization.`
    ],
    facts: [
      `Function: ${entity.name} supports the lesson objective.`,
      `Working: inspect ${entity.name} from multiple angles.`,
      `Interesting fact: this element was auto-selected by the AI scene engine.`
    ]
  }));

  const supports3D = objects.length > 0;
  const fallbackType = supports3D ? '3d' : 'diagram';

  return {
    title: plan.sceneTitle,
    category: plan.subject,
    supports3D,
    fallbackType,
    summary: plan.summary,
    objects,
    labels: objects.map((item) => item.label),
    hotspots: objects.map((item) => ({
      label: item.label,
      category: item.category,
      details: item.facts
    })),
    timeline: plan.timeline,
    cameraCues: plan.cameraCues,
    animationTargets: plan.animationTargets,
    simulationMode: plan.simulationMode,
    assessment: plan.assessment,
    practiceMode: plan.practiceMode,
    syncCues: plan.syncCues,
    reusableAssets: objects.map((item) => item.asset),
    lod: {
      high: objects.slice(0, 8).map((item) => item.id),
      medium: objects.slice(8, 20).map((item) => item.id),
      low: objects.slice(20).map((item) => item.id)
    },
    renderHints: {
      progressiveLoading: true,
      compressedAssets: true,
      reuseModels: true,
      vrReadyFuture: true,
      arReadyFuture: true
    }
  };
}
