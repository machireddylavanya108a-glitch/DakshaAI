import { createAssetManager } from '../../utils/assetManager.js';

const CATEGORY_COLOR = {
  'Human Anatomy': '#f97316',
  Humans: '#fb7185',
  Machines: '#60a5fa',
  Buildings: '#14b8a6',
  Animals: '#22c55e',
  Plants: '#84cc16',
  Chemistry: '#a78bfa',
  Physics: '#06b6d4',
  Engineering: '#3b82f6',
  Medical: '#ef4444',
  Geography: '#f59e0b',
  Space: '#e879f9',
  Architecture: '#0ea5e9',
  Vehicles: '#6366f1',
  Electronics: '#38bdf8',
  Tools: '#64748b',
  Sports: '#10b981',
  'Musical Instruments': '#ec4899',
  'Laboratories': '#8b5cf6',
  'Medical Tools': '#f43f5e',
  Astronomy: '#8b5cf6',
  'Business Processes': '#06b6d4',
  'General Objects': '#94a3b8'
};

const ASSET_LIBRARY = {
  'Human Anatomy': ['Heart Anatomy Model', 'Kidney Model', 'Brain Model'],
  Animals: ['Animal Body Model', 'Skeleton Model'],
  Plants: ['Plant Cell Model', 'Leaf Structure Model'],
  Vehicles: ['Car Chassis', 'Engine Assembly'],
  Buildings: ['Hospital Interior', 'Factory Hall', 'City Block'],
  Machines: ['Engine Block', 'Gear System', 'Piston Set'],
  'Industrial Equipment': ['Conveyor Assembly', 'Hydraulic Press'],
  'Medical Tools': ['Surgical Tool Kit', 'Medical Monitor'],
  Chemistry: ['Molecule Kit', 'Reaction Chamber'],
  Physics: ['Force Vector Rig', 'Wave Simulator'],
  Astronomy: ['Solar System Rig', 'Orbital Path Set'],
  Geography: ['Terrain Model', 'Earth Layers'],
  Architecture: ['Bridge Structure', 'Building Frame'],
  Electronics: ['Circuit Board', 'Microcontroller'],
  Sports: ['Athlete Motion Rig', 'Sports Arena'],
  Laboratories: ['Lab Table', 'Beaker Set'],
  Furniture: ['Desk Set', 'Chair Set'],
  Environment: ['Lighting Rig', 'Sky Dome'],
  Robotics: ['Robot Arm', 'Actuator Set'],
  'General Objects': ['Concept Cube', 'Flow Nodes', 'Label Markers'],
  Humans: ['Doctor Character', 'Learner Avatar'],
  'Business Processes': ['Workflow Nodes', 'Stage Connectors']
};

function chooseAsset(category = 'General Objects') {
  const manager = createAssetManager();
  const asset = manager.getAssetsByCategory(category)[0] || manager.getAssetById('heart-anatomy');
  return asset?.id || 'heart-anatomy';
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
    color: CATEGORY_COLOR[entity.category] || '#94a3b8',
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
