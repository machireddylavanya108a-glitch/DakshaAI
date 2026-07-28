import { sanitizePrompt } from '../utils/security.js';

function normalizeText(value = '') {
  return sanitizePrompt(String(value || '').replace(/\s+/g, ' ').trim());
}

function compactList(values = [], limit = 10, maxItemChars = 220) {
  if (!Array.isArray(values)) return [];
  return values
    .map((value) => normalizeText(value))
    .filter(Boolean)
    .slice(0, limit)
    .map((value) => value.slice(0, maxItemChars));
}

function compactParagraphs(paragraphs = [], maxChars = 5000) {
  const output = [];
  let used = 0;

  for (const paragraph of paragraphs) {
    const normalized = normalizeText(paragraph);
    if (!normalized) continue;
    if (used >= maxChars) break;

    const remaining = maxChars - used;
    const next = normalized.slice(0, remaining);
    output.push(next);
    used += next.length;
  }

  return output;
}

export function buildScenePlanningPrompt(normalizedInput = {}, config = {}) {
  const title = normalizeText(normalizedInput.title || normalizedInput.topic || 'Learning Topic').slice(0, 200);
  const topic = normalizeText(normalizedInput.topic || normalizedInput.title || 'Open Topic').slice(0, 220);
  const content = compactParagraphs(Array.isArray(normalizedInput.content) ? normalizedInput.content : [normalizedInput.content], 4800);
  const concepts = compactList(normalizedInput.concepts, 12, 120);
  const steps = compactList(normalizedInput.steps, 12, 200);
  const goals = compactList(normalizedInput.goals, 10, 200);
  const examples = compactList(normalizedInput.examples, 8, 180);
  const difficulty = normalizeText(normalizedInput.difficulty || 'adaptive').slice(0, 40);
  const learnerContext = normalizeText(JSON.stringify(normalizedInput.learnerContext || {})).slice(0, 600);
  const classification = normalizedInput.classification && typeof normalizedInput.classification === 'object'
    ? normalizedInput.classification
    : {};

  const schemaContract = {
    version: config.schemaVersion || 'v2',
    sceneId: 'string',
    title: 'string',
    subject: 'string',
    classification: {
      domain: 'string',
      subDomain: 'string',
      visualization: 'string',
      sceneComplexity: 'string',
      objectCategory: 'string',
      animationCategory: 'string',
      interactionCategory: 'string',
      interaction: 'string',
      confidence: 'number',
      metadata: 'object'
    },
    environment: 'object',
    camera: 'object',
    timeline: 'array',
    objects: 'array',
    labels: 'array',
    animations: 'array',
    interactions: 'array',
    narration: 'object',
    metadata: 'object',
    checkpoints: 'array'
  };

  const userPayload = {
    lessonTitle: title,
    lessonTopic: topic,
    essentialContent: content,
    keyConcepts: concepts,
    lessonSteps: steps,
    learningGoals: goals,
    examples,
    difficulty,
    learnerContext,
    classification
  };

  const system = [
    'You are generating an educational scene plan, not writing a normal lesson.',
    'Return JSON only and never include markdown code fences.',
    'Use the universal dynamic classification object. Never assume fixed subject enums.',
    'Create meaningful educational objects, timeline steps, interactions, animation, camera and narration links.',
    'Avoid unsupported facts. Preserve source meaning. Include confidence and uncertainty where needed.',
    'Do not emit executable code, HTML scripts, URLs, or commands in any field.',
    `Target schema contract: ${JSON.stringify(schemaContract)}`
  ].join(' ');

  const user = JSON.stringify(userPayload);

  return {
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user }
    ],
    promptLength: system.length + user.length,
    compactedInputLength: JSON.stringify(userPayload).length
  };
}
