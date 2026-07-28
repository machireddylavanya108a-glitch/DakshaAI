import { buildSceneBlueprint } from '../../utils/aiSceneEngine.js';

const SUBJECT_KEYWORDS = {
  medicine: ['medical', 'anatomy', 'surgery', 'heart', 'kidney', 'hospital', 'clinical'],
  engineering: ['engine', 'gearbox', 'machine', 'mechanical', 'robot', 'assembly', 'transmission'],
  science: ['physics', 'chemistry', 'biology', 'reaction', 'experiment', 'lab'],
  space: ['space', 'planet', 'solar', 'orbit', 'astronomy', 'galaxy'],
  architecture: ['building', 'architecture', 'construction', 'bridge', 'structure'],
  geography: ['geography', 'earth', 'terrain', 'climate', 'map', 'volcano'],
  electronics: ['circuit', 'electronics', 'cpu', 'sensor', 'board', 'microcontroller'],
  business: ['workflow', 'business', 'market', 'operations', 'supply chain'],
  sports: ['sports', 'movement', 'athlete', 'game', 'training'],
  music: ['music', 'instrument', 'guitar', 'piano', 'rhythm', 'composition'],
  cooking: ['cooking', 'kitchen', 'recipe', 'ingredient', 'food']
};

const ENTITY_LIBRARY = [
  { name: 'Hospital', category: 'Buildings', tags: ['hospital', 'clinic'] },
  { name: 'Operating Table', category: 'Medical Tools', tags: ['operating table', 'operation'] },
  { name: 'Doctor', category: 'Humans', tags: ['doctor', 'surgeon'] },
  { name: 'Heart', category: 'Human Anatomy', tags: ['heart', 'ventricle', 'blood'] },
  { name: 'Blood Vessels', category: 'Human Anatomy', tags: ['artery', 'vein', 'vessels'] },
  { name: 'Medical Tools', category: 'Medical Tools', tags: ['scalpel', 'medical tools', 'forceps'] },
  { name: 'Patient', category: 'Humans', tags: ['patient'] },
  { name: 'Engine Block', category: 'Machines', tags: ['engine block', 'engine'] },
  { name: 'Piston', category: 'Machines', tags: ['piston'] },
  { name: 'Cylinder', category: 'Machines', tags: ['cylinder'] },
  { name: 'Spark Plug', category: 'Machines', tags: ['spark plug'] },
  { name: 'Fuel System', category: 'Machines', tags: ['fuel system'] },
  { name: 'Transmission', category: 'Machines', tags: ['transmission', 'gearbox'] },
  { name: 'Circuit Board', category: 'Electronics', tags: ['circuit', 'pcb', 'board'] },
  { name: 'Resistor', category: 'Electronics', tags: ['resistor'] },
  { name: 'Capacitor', category: 'Electronics', tags: ['capacitor'] },
  { name: 'Planetary System', category: 'Astronomy', tags: ['planet', 'orbit', 'solar'] },
  { name: 'Chemical Flask', category: 'Laboratories', tags: ['flask', 'beaker', 'reaction'] },
  { name: 'Molecule Set', category: 'Chemistry', tags: ['molecule', 'compound', 'atom'] },
  { name: 'Bridge Span', category: 'Architecture', tags: ['bridge', 'beam'] },
  { name: 'Animal Body', category: 'Animals', tags: ['animal', 'species'] },
  { name: 'Plant Cell', category: 'Plants', tags: ['plant', 'leaf', 'stem'] },
  { name: 'Workflow Stage', category: 'Business Processes', tags: ['workflow', 'process', 'pipeline'] },
  { name: 'Sports Drill', category: 'Sports', tags: ['sports', 'drill', 'movement'] },
  { name: 'Musical Instrument', category: 'Musical Instruments', tags: ['music', 'guitar', 'piano', 'violin'] }
];

function detectSubject(content = '') {
  const normalized = String(content || '').toLowerCase();
  const scores = Object.entries(SUBJECT_KEYWORDS).map(([subject, words]) => ({
    subject,
    score: words.reduce((acc, word) => (normalized.includes(word) ? acc + 1 : acc), 0)
  }));

  scores.sort((a, b) => b.score - a.score);
  if (scores[0]?.score > 0) return scores[0].subject;

  const modelMatch = modelLibrary.find((model) => model.keywords.some((word) => normalized.includes(word)));
  if (modelMatch) return modelMatch.category.toLowerCase();

  return 'general';
}

function detectEntities(content = '') {
  const normalized = String(content || '').toLowerCase();
  const entities = ENTITY_LIBRARY.filter((item) => item.tags.some((tag) => normalized.includes(tag)));

  if (entities.length) return entities;

  return [
    { name: 'Core Concept', category: 'General Objects', tags: ['concept'] },
    { name: 'Process Flow', category: 'General Objects', tags: ['flow'] },
    { name: 'Applied Scenario', category: 'General Objects', tags: ['scenario'] }
  ];
}

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
  const entities = blueprint.entities.map((entity) => ({
    name: entity.name,
    category: entity.category,
    tags: [entity.concept, entity.category.toLowerCase()]
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
