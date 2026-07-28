function sanitizeText(value = '', maxLength = 180) {
  return String(value || '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/on[a-z]+\s*=\s*"[^"]*"/gi, '')
    .replace(/on[a-z]+\s*=\s*'[^']*'/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

export function generateEducationalObjectLabels(object = {}, concept = {}, context = {}, options = {}) {
  const objectId = String(object.objectId || object.id || 'object');
  const index = Number(options.objectIndex || 0);
  const language = String(context.metadata?.locale || context.locale || 'en');

  const baseText = sanitizeText(concept.label || concept.name || object.name || `Concept ${index + 1}`, 120);
  const shortText = sanitizeText(baseText.split(' ').slice(0, 4).join(' '), 60) || `Obj ${index + 1}`;
  const description = sanitizeText(
    concept.summary || concept.description || `${baseText} contributes to the learning objective through a structured visual role.`,
    220
  );

  return [{
    id: `${objectId}-label`,
    text: baseText || `Object ${index + 1}`,
    shortText,
    description,
    targetObjectId: objectId,
    priority: Math.max(1, Number(options.priority || index + 1)),
    visibility: true,
    readingOrder: Math.max(1, Number(options.readingOrder || index + 1)),
    language,
    metadata: {
      generated: true,
      accessibilityAware: true
    }
  }];
}
