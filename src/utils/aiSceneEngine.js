const DOMAIN_KEYWORDS = {
  'Human Anatomy': ['heart', 'anatomy', 'organ', 'bone', 'muscle', 'surgery', 'medical', 'cell', 'brain', 'kidney', 'lung'],
  Biology: ['biology', 'cell', 'dna', 'gene', 'organism', 'ecosystem', 'virus', 'microbe'],
  Physics: ['physics', 'force', 'motion', 'energy', 'wave', 'gravity', 'momentum', 'thermodynamics'],
  Chemistry: ['chemistry', 'molecule', 'atom', 'reaction', 'compound', 'bond', 'electron', 'acid'],
  Astronomy: ['astronomy', 'planet', 'star', 'galaxy', 'orbit', 'solar', 'moon', 'cosmos'],
  Mathematics: ['math', 'equation', 'geometry', 'algebra', 'calculus', 'proof', 'vector', 'function'],
  Engineering: ['engineering', 'system', 'design', 'prototype', 'mechanism', 'circuit', 'control'],
  Mechanical: ['mechanical', 'gear', 'engine', 'motor', 'piston', 'turbine', 'shaft', 'machine'],
  Architecture: ['architecture', 'building', 'bridge', 'structure', 'façade', 'beam', 'floor', 'design'],
  Animals: ['animal', 'species', 'habitat', 'predator', 'mammal', 'bird', 'fish'],
  Plants: ['plant', 'leaf', 'root', 'flower', 'stem', 'photosynthesis', 'bloom'],
  Electronics: ['electronic', 'circuit', 'transistor', 'microchip', 'sensor', 'voltage', 'board'],
  Vehicles: ['vehicle', 'car', 'train', 'plane', 'ship', 'engine', 'wheel', 'chassis'],
  Buildings: ['building', 'house', 'office', 'hospital', 'factory', 'room', 'floorplan'],
  Medical: ['medical', 'diagnosis', 'clinic', 'treatment', 'patient', 'hospital', 'surgery'],
  'Business Diagrams': ['business', 'workflow', 'process', 'market', 'revenue', 'strategy', 'pipeline'],
  'Computer Science': ['computer', 'software', 'algorithm', 'programming', 'code', 'network', 'data', 'python', 'java', 'socket', 'router'],
  Networking: ['network', 'router', 'switch', 'packet', 'protocol', 'tcp', 'dns', 'server'],
  Programming: ['programming', 'code', 'function', 'loop', 'class', 'debug', 'python', 'javascript', 'api'],
  Robotics: ['robot', 'robotics', 'arm', 'sensor', 'automation', 'control', 'actuator'],
};

const ASSET_LIBRARY = {
  'Human Anatomy': [
    { assetId: 'heart-anatomy', label: 'Heart Anatomy', category: 'Human Anatomy', icon: '🫀' },
    { assetId: 'brain-model', label: 'Brain Model', category: 'Human Anatomy', icon: '🧠' },
    { assetId: 'skeletal-system', label: 'Skeletal System', category: 'Human Anatomy', icon: '🦴' }
  ],
  Biology: [
    { assetId: 'cell-model', label: 'Cell Model', category: 'Biology', icon: '🧫' },
    { assetId: 'dna-helix', label: 'DNA Helix', category: 'Biology', icon: '🧬' },
    { assetId: 'microbe-scene', label: 'Microbe Scene', category: 'Biology', icon: '🦠' }
  ],
  Physics: [
    { assetId: 'force-vector', label: 'Force Vector', category: 'Physics', icon: '⚛️' },
    { assetId: 'wave-sim', label: 'Wave Sim', category: 'Physics', icon: '🌊' },
    { assetId: 'energy-core', label: 'Energy Core', category: 'Physics', icon: '💡' }
  ],
  Chemistry: [
    { assetId: 'molecule-kit', label: 'Molecule Kit', category: 'Chemistry', icon: '🧪' },
    { assetId: 'reaction-chamber', label: 'Reaction Chamber', category: 'Chemistry', icon: '⚗️' },
    { assetId: 'atom-core', label: 'Atom Core', category: 'Chemistry', icon: '☢️' }
  ],
  Astronomy: [
    { assetId: 'solar-system', label: 'Solar System', category: 'Astronomy', icon: '☀️' },
    { assetId: 'orbital-view', label: 'Orbital View', category: 'Astronomy', icon: '🪐' },
    { assetId: 'galaxy-core', label: 'Galaxy Core', category: 'Astronomy', icon: '✨' }
  ],
  Mathematics: [
    { assetId: 'graph-grid', label: 'Graph Grid', category: 'Mathematics', icon: '📐' },
    { assetId: 'vector-space', label: 'Vector Space', category: 'Mathematics', icon: '📊' },
    { assetId: 'calc-surface', label: 'Calculus Surface', category: 'Mathematics', icon: '📈' }
  ],
  Engineering: [
    { assetId: 'engineering-diagram', label: 'Engineering Diagram', category: 'Engineering', icon: '🛠️' },
    { assetId: 'prototype-rig', label: 'Prototype Rig', category: 'Engineering', icon: '🔧' },
    { assetId: 'system-flow', label: 'System Flow', category: 'Engineering', icon: '⚙️' }
  ],
  Mechanical: [
    { assetId: 'mechanical-assembly', label: 'Mechanical Assembly', category: 'Mechanical', icon: '🧰' },
    { assetId: 'engine-block', label: 'Engine Block', category: 'Mechanical', icon: '🚗' },
    { assetId: 'gear-train', label: 'Gear Train', category: 'Mechanical', icon: '⚙️' }
  ],
  Architecture: [
    { assetId: 'building-frame', label: 'Building Frame', category: 'Architecture', icon: '🏗️' },
    { assetId: 'bridge-structure', label: 'Bridge Structure', category: 'Architecture', icon: '🌉' },
    { assetId: 'floor-plan', label: 'Floor Plan', category: 'Architecture', icon: '🏛️' }
  ],
  Animals: [
    { assetId: 'animal-body', label: 'Animal Body', category: 'Animals', icon: '🐾' },
    { assetId: 'habitat-scene', label: 'Habitat Scene', category: 'Animals', icon: '🌿' },
    { assetId: 'ecosystem-map', label: 'Ecosystem Map', category: 'Animals', icon: '🦉' }
  ],
  Plants: [
    { assetId: 'plant-structure', label: 'Plant Structure', category: 'Plants', icon: '🌱' },
    { assetId: 'leaf-cross-section', label: 'Leaf Cross Section', category: 'Plants', icon: '🍃' },
    { assetId: 'flower-bloom', label: 'Flower Bloom', category: 'Plants', icon: '🌼' }
  ],
  Electronics: [
    { assetId: 'circuit-board', label: 'Circuit Board', category: 'Electronics', icon: '🔌' },
    { assetId: 'microchip', label: 'Microchip', category: 'Electronics', icon: '💻' },
    { assetId: 'sensor-node', label: 'Sensor Node', category: 'Electronics', icon: '📡' }
  ],
  Vehicles: [
    { assetId: 'vehicle-chassis', label: 'Vehicle Chassis', category: 'Vehicles', icon: '🚙' },
    { assetId: 'engine-system', label: 'Engine System', category: 'Vehicles', icon: '🛞' },
    { assetId: 'aerospace-frame', label: 'Aerospace Frame', category: 'Vehicles', icon: '✈️' }
  ],
  Buildings: [
    { assetId: 'building-layout', label: 'Building Layout', category: 'Buildings', icon: '🏢' },
    { assetId: 'room-scene', label: 'Room Scene', category: 'Buildings', icon: '🛋️' },
    { assetId: 'factory-layout', label: 'Factory Layout', category: 'Buildings', icon: '🏭' }
  ],
  Medical: [
    { assetId: 'medical-suite', label: 'Medical Suite', category: 'Medical', icon: '🩺' },
    { assetId: 'diagnostic-room', label: 'Diagnostic Room', category: 'Medical', icon: '🧑‍⚕️' },
    { assetId: 'surgical-scene', label: 'Surgical Scene', category: 'Medical', icon: '🩹' }
  ],
  'Business Diagrams': [
    { assetId: 'workflow-map', label: 'Workflow Map', category: 'Business Diagrams', icon: '📋' },
    { assetId: 'pipeline-diagram', label: 'Pipeline Diagram', category: 'Business Diagrams', icon: '🔄' },
    { assetId: 'org-chart', label: 'Org Chart', category: 'Business Diagrams', icon: '🧭' }
  ],
  'Computer Science': [
    { assetId: 'data-graph', label: 'Data Graph', category: 'Computer Science', icon: '🧠' },
    { assetId: 'network-map', label: 'Network Map', category: 'Computer Science', icon: '🌐' },
    { assetId: 'code-stack', label: 'Code Stack', category: 'Computer Science', icon: '💾' }
  ],
  Networking: [
    { assetId: 'network-topology', label: 'Network Topology', category: 'Networking', icon: '📶' },
    { assetId: 'router-stack', label: 'Router Stack', category: 'Networking', icon: '🧩' },
    { assetId: 'packet-flow', label: 'Packet Flow', category: 'Networking', icon: '📦' }
  ],
  Programming: [
    { assetId: 'code-structure', label: 'Code Structure', category: 'Programming', icon: '⌨️' },
    { assetId: 'function-flow', label: 'Function Flow', category: 'Programming', icon: '🧱' },
    { assetId: 'debug-graph', label: 'Debug Graph', category: 'Programming', icon: '🐞' }
  ],
  Robotics: [
    { assetId: 'robot-arm', label: 'Robot Arm', category: 'Robotics', icon: '🤖' },
    { assetId: 'automation-cell', label: 'Automation Cell', category: 'Robotics', icon: '🦾' },
    { assetId: 'sensor-grid', label: 'Sensor Grid', category: 'Robotics', icon: '📡' }
  ],
};

function detectDomain(content = '') {
  const normalized = String(content || '').toLowerCase();
  const scores = Object.entries(DOMAIN_KEYWORDS).map(([domain, keywords]) => ({
    domain,
    score: keywords.reduce((acc, keyword) => (normalized.includes(keyword) ? acc + 1 : acc), 0)
  })).sort((a, b) => b.score - a.score);

  if (scores[0]?.score > 0) return scores[0].domain;
  return 'General';
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

function buildAssetPlan(domain = 'General', entities = []) {
  const assets = ASSET_LIBRARY[domain] || ASSET_LIBRARY['Computer Science'] || [];
  const selected = assets.slice(0, Math.min(3, Math.max(1, entities.length)));
  return selected.map((asset, index) => ({
    assetId: asset.assetId,
    label: asset.label,
    category: asset.category,
    icon: asset.icon,
    focus: entities[index]?.name || 'core concept'
  }));
}

export function buildSceneBlueprint(content = '', sourceType = 'typed-topic') {
  const domain = detectDomain(content);
  const entities = chooseEntities(content, domain);
  const assetPlan = buildAssetPlan(domain, entities);

  return {
    domain,
    sourceType,
    concepts: tokenizeConcepts(content),
    entities,
    assetPlan,
    summary: `Dynamic ${domain.toLowerCase()} scene constructed from lesson content and ${sourceType} input.`,
    sceneTitle: `${domain} learning scene`
  };
}

export function buildSceneFromBlueprint(blueprint) {
  const entities = blueprint?.entities || [];
  const assetPlan = blueprint?.assetPlan || [];
  const objects = entities.map((entity, index) => ({
    label: entity.name,
    category: entity.category,
    asset: assetPlan[index]?.assetId || 'concept-node',
    color: ['#34d399', '#60a5fa', '#f59e0b', '#f472b6', '#a78bfa'][index % 5],
    position: [index * 1.2 - (entities.length - 1) * 0.6, 0, 0],
    size: [0.95, 0.95, 0.95],
    facts: [
      `${entity.name} represents a major concept in this lesson.`,
      `${entity.category} assets were auto-selected for the scene.`,
      `The scene is built dynamically from the lesson content.`
    ]
  }));

  const domainLabel = String(blueprint?.domain || 'General').toLowerCase();
  const summary = `${blueprint?.summary || 'Dynamic scene'} It adapts to ${blueprint?.domain || 'the lesson'} and uses ${assetPlan.length} auto-selected assets. This ${domainLabel} scene is generated for programming lessons and uses interactive objects that map to the lesson flow.`;

  return {
    title: blueprint?.sceneTitle || 'AI scene',
    category: blueprint?.domain || 'General',
    supports3D: true,
    fallbackType: '3d',
    objects,
    labels: objects.map((item) => item.label),
    hotspots: objects.map((item) => ({ label: item.label, category: item.category, details: item.facts })),
    summary,
    assetPlan,
    lessonFocus: blueprint?.concepts?.[0] || 'concept',
    domain: blueprint?.domain || 'General'
  };
}
