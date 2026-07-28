function sanitizeText(value = '', maxLength = 280) {
  return String(value || '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

export function generateEducationalObjectNarration(object = {}, concept = {}, context = {}, options = {}) {
  const objectId = String(object.objectId || object.id || 'object');
  const language = String(context.metadata?.locale || context.locale || 'en');
  const index = Number(options.objectIndex || 0);

  const role = String(object.learningPurpose || object.semanticRole || 'inspect');
  const focus = sanitizeText(concept.label || concept.name || object.name || `Concept ${index + 1}`, 100);
  const relationHint = Array.isArray(context.relationships) && context.relationships.length
    ? ` It connects through ${Math.min(3, context.relationships.length)} key relationships.`
    : '';

  const text = sanitizeText(`${focus} is presented to support ${role} and concept understanding.${relationHint}`, 260);

  return {
    text,
    shortText: sanitizeText(`${focus} supports ${role}.`, 120),
    cueIds: [],
    timelineStepIds: [],
    objectReferences: [objectId],
    language,
    accessibilityPurpose: 'instructional-summary',
    metadata: {
      generated: true,
      concise: true
    }
  };
}
