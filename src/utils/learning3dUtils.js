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
