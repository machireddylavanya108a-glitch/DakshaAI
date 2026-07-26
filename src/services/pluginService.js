export const pluginCatalog = [
  {
    id: 'plugin-math',
    name: 'Math Mentor',
    category: 'AI Agent',
    price: 'Free',
    rating: 4.9,
    downloads: 18300,
    verified: true,
    description: 'Adds guided math tutoring and step-by-step explanations.',
    target: 'AI Teacher'
  },
  {
    id: 'plugin-ocr',
    name: 'Vision OCR',
    category: 'OCR',
    price: '$9',
    rating: 4.8,
    downloads: 9200,
    verified: true,
    description: 'Adds OCR, handwriting extraction, and structured analysis.',
    target: 'Scanner'
  },
  {
    id: 'plugin-theme',
    name: 'Glass Classroom',
    category: 'Theme',
    price: '$4',
    rating: 4.7,
    downloads: 5400,
    verified: true,
    description: 'Provides polished education themes for dark, light, and glass modes.',
    target: 'Dashboard'
  }
];

export function getPluginCatalog() {
  return pluginCatalog;
}
