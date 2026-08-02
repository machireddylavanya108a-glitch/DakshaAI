export const UNIVERSAL_AI_KNOWLEDGE_MEMORY_SCHEMA_VERSION = 'v1';

export const DEFAULT_UNIVERSAL_AI_KNOWLEDGE_MEMORY_CONFIG = {
  schemaVersion: UNIVERSAL_AI_KNOWLEDGE_MEMORY_SCHEMA_VERSION,
  persistenceKey: 'daksha.universal.ai.knowledge.memory.engine.v1',
  maxGraphNodes: 1200,
  maxGraphEdges: 2400,
  maxClusters: 200,
  maxMemories: 500,
  maxHistory: 1000,
  defaultLanguage: 'English'
};

export function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function asArray(value) {
  return Array.isArray(value) ? value : [];
}

export function safeString(value) {
  return String(value || '').trim();
}

export function toFiniteNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function clamp(value, minimum = 0, maximum = 1) {
  const numberValue = toFiniteNumber(value, minimum);
  return Math.min(Math.max(numberValue, minimum), maximum);
}

export function uniqueStrings(values = [], max = 400) {
  const output = [];
  const seen = new Set();

  asArray(values).forEach((value) => {
    const text = safeString(value);
    if (!text) return;
    const key = text.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    output.push(text);
  });

  return output.slice(0, max);
}
