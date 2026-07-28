export const modelLibrary = [
  {
    id: 'heart',
    name: 'Human Heart',
    category: 'Human Anatomy',
    keywords: ['heart', 'circulation', 'anatomy', 'blood'],
    description: 'Study the chambers, valves, and blood flow through the human heart.'
  },
  {
    id: 'brain',
    name: 'Brain',
    category: 'Human Anatomy',
    keywords: ['brain', 'neuron', 'cognition'],
    description: 'Visualize the lobes and neural pathways of the brain.'
  },
  {
    id: 'solar-system',
    name: 'Solar System',
    category: 'Astronomy',
    keywords: ['solar', 'system', 'planet', 'orbit'],
    description: 'Explore planets and orbital relationships in the solar system.'
  },
  {
    id: 'electric-motor',
    name: 'Electric Motor',
    category: 'Mechanical Systems',
    keywords: ['motor', 'electric', 'generator', 'mechanics'],
    description: 'Understand electromagnetic rotation in a simple motor.'
  },
  {
    id: 'dna',
    name: 'DNA Helix',
    category: 'Biology',
    keywords: ['dna', 'gene', 'helix', 'biology'],
    description: 'Inspect the double-helix structure of DNA.'
  },
  {
    id: 'atom',
    name: 'Atom',
    category: 'Chemistry',
    keywords: ['atom', 'electron', 'chemistry', 'nucleus'],
    description: 'Break down the atomic structure into protons, neutrons, and electrons.'
  },
  {
    id: 'earth-layers',
    name: 'Earth Layers',
    category: 'Geography',
    keywords: ['earth', 'layers', 'geology', 'crust'],
    description: 'Inspect the crust, mantle, outer core, and inner core.'
  },
  {
    id: 'cell',
    name: 'Cell',
    category: 'Biology',
    keywords: ['cell', 'membrane', 'organelle'],
    description: 'Explore the basic structure of living cells.'
  },
  {
    id: 'cpu',
    name: 'CPU',
    category: 'Engineering',
    keywords: ['cpu', 'chip', 'processor', 'circuit'],
    description: 'Visualize a simplified CPU architecture and logic flow.'
  },
  {
    id: 'bridge',
    name: 'Bridge Structure',
    category: 'Architecture',
    keywords: ['bridge', 'structure', 'beam', 'support'],
    description: 'Understand load paths and tension in architectural systems.'
  }
];

export const categories = [
  'Biology',
  'Chemistry',
  'Physics',
  'Mathematics',
  'Engineering',
  'Astronomy',
  'Geography',
  'Human Anatomy',
  'Mechanical Systems',
  'Architecture'
];

export function filterModels(query = '', selectedCategory = 'All') {
  const normalizedQuery = query.trim().toLowerCase();
  return modelLibrary.filter((model) => {
    const matchesCategory = selectedCategory === 'All' || model.category === selectedCategory;
    const matchesQuery = !normalizedQuery || [model.name, model.category, ...model.keywords].some((value) => value.toLowerCase().includes(normalizedQuery));
    return matchesCategory && matchesQuery;
  });
}

export function getModelById(modelId) {
  return modelLibrary.find((model) => model.id === modelId) || modelLibrary[0];
}

export function build3DSceneFromContent(content = '', selectedModelId = null) {
  const normalized = String(content || '').toLowerCase();
  const matchedModel = modelLibrary.find((model) => model.keywords.some((keyword) => normalized.includes(keyword)));
  const modelId = selectedModelId || matchedModel?.id || null;
  const model = modelId ? getModelById(modelId) : null;

  const labels = modelId === 'heart'
    ? ['Atria', 'Ventricles', 'Valves']
    : modelId === 'brain'
      ? ['Cerebrum', 'Cerebellum', 'Brainstem']
      : modelId === 'solar-system'
        ? ['Sun', 'Earth', 'Mars']
        : modelId === 'electric-motor'
          ? ['Rotor', 'Stator', 'Coils']
          : modelId === 'dna'
            ? ['Base Pairs', 'Sugar Backbone', 'Helix Twist']
            : modelId === 'atom'
              ? ['Nucleus', 'Electrons', 'Orbitals']
              : modelId === 'earth-layers'
                ? ['Crust', 'Mantle', 'Core']
                : modelId === 'cell'
                  ? ['Membrane', 'Nucleus', 'Organelles']
                  : modelId === 'cpu'
                    ? ['Core', 'Cache', 'Registers']
                    : modelId === 'bridge'
                      ? ['Deck', 'Supports', 'Tension Members']
                      : ['Concept', 'Structure', 'Connections'];

  const objects = labels.map((label, index) => ({
    label,
    color: ['#34d399', '#60a5fa', '#f59e0b', '#f472b6', '#a78bfa'][index % 5],
    position: [index * 1.1 - (labels.length - 1) * 0.55, 0, 0],
    size: [0.85, 0.85, 0.85]
  }));

  const supports3D = Boolean(model);
  const category = model?.category || 'Concept';
  const title = model?.name || 'Adaptive concept scene';

  return {
    title,
    category,
    recommendedModel: model?.id || null,
    supports3D,
    fallbackType: supports3D ? '3d' : 'diagram',
    labels,
    hotspots: labels.map((label) => ({ label })),
    objects,
    summary: supports3D
      ? `Interactive 3D scene tuned for ${title.toLowerCase()}.`
      : `No exact 3D asset was found, so Daksha is showing an interactive diagram and labeled illustration for ${normalized || 'this topic'}.`
  };
}
