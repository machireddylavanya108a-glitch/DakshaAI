import { createDefaultCapabilityDescriptor, VISUALIZATION_CAPABILITY_KEYS } from './VisualizationCapabilitySchema.js';
import { normalizeVisualizationCapabilityConfig } from './VisualizationCapabilityConfig.js';

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function sanitizeString(value, maxLength) {
  return String(value || '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/on[a-z]+\s*=\s*"[^"]*"/gi, '')
    .replace(/on[a-z]+\s*=\s*'[^']*'/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/data:text\/html/gi, '')
    .replace(/import\s*\(/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function toFiniteNumber(value, fallback = 0) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return numeric;
}

function cleanValue(value, config, seen = new WeakSet()) {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'function') return undefined;
  if (typeof value === 'bigint') return Number(value);

  if (typeof value === 'string') {
    return sanitizeString(value, config.maxStringLength);
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value !== 'object') return value;

  if (seen.has(value)) return '[circular]';
  seen.add(value);

  if (Array.isArray(value)) {
    return value
      .map((entry) => cleanValue(entry, config, seen))
      .filter((entry) => entry !== undefined)
      .slice(0, config.maxRuleCount);
  }

  const output = Object.create(null);
  for (const [key, nested] of Object.entries(value)) {
    if (key === '__proto__' || key === 'prototype' || key === 'constructor') continue;
    if (key === '$$typeof' || key === '_owner') continue;
    const cleaned = cleanValue(nested, config, seen);
    if (cleaned !== undefined) output[key] = cleaned;
  }
  return output;
}

function normalizeRules(rules, config) {
  const source = Array.isArray(rules) ? rules : [];
  return source.slice(0, config.maxRuleCount).map((rule, index) => {
    const value = isObject(rule) ? rule : {};
    return {
      id: sanitizeString(value.id || `rule-${index + 1}`, 120),
      field: sanitizeString(value.field || '', 240),
      operator: sanitizeString(value.operator || 'exists', 80),
      expectedValue: cleanValue(value.expectedValue, config),
      required: value.required !== false,
      weight: Math.max(0, Math.min(10, toFiniteNumber(value.weight, 1))),
      metadata: isObject(value.metadata) ? cleanValue(value.metadata, config) : {}
    };
  });
}

export function normalizeVisualizationCapability(input = {}, options = {}) {
  const config = normalizeVisualizationCapabilityConfig(options);
  const base = createDefaultCapabilityDescriptor();
  const source = isObject(input) ? cleanValue(input, config) : {};

  const extensionSource = {};
  for (const [key, value] of Object.entries(source || {})) {
    if (!VISUALIZATION_CAPABILITY_KEYS.includes(key)) {
      extensionSource[key] = value;
    }
  }

  const semanticPurpose = sanitizeString(
    source.semanticPurpose || source.semantic_purpose || source.purpose || base.semanticPurpose,
    200
  );

  const actionsRaw = source.supportedLearningActions || source.learningActions || source.actions || [];
  const supportedLearningActions = Array.isArray(actionsRaw)
    ? actionsRaw.map((item) => sanitizeString(item, 120)).filter(Boolean).slice(0, config.maxActionCount)
    : [];

  const normalized = {
    ...base,
    ...source,
    id: sanitizeString(source.id || '', 160),
    version: sanitizeString(source.version || base.version, 40),
    name: sanitizeString(source.name || base.name, 240),
    description: sanitizeString(source.description || base.description, config.maxDescriptionLength),
    semanticPurpose,
    supportedLearningActions,
    inputRequirements: normalizeRules(source.inputRequirements || source.requirements, config),
    outputHints: isObject(source.outputHints) ? source.outputHints : (isObject(source.output_hints) ? source.output_hints : base.outputHints),
    spatialProperties: isObject(source.spatialProperties) ? source.spatialProperties : (isObject(source.spatial) ? source.spatial : base.spatialProperties),
    temporalProperties: isObject(source.temporalProperties) ? source.temporalProperties : (isObject(source.temporal) ? source.temporal : base.temporalProperties),
    interactionProperties: isObject(source.interactionProperties)
      ? source.interactionProperties
      : (isObject(source.interactions) ? source.interactions : base.interactionProperties),
    animationProperties: isObject(source.animationProperties) ? source.animationProperties : base.animationProperties,
    cameraProperties: isObject(source.cameraProperties) ? source.cameraProperties : base.cameraProperties,
    accessibilityProperties: isObject(source.accessibilityProperties)
      ? source.accessibilityProperties
      : (isObject(source.accessibility) ? source.accessibility : base.accessibilityProperties),
    performanceProperties: isObject(source.performanceProperties) ? source.performanceProperties : base.performanceProperties,
    compositionRules: normalizeRules(source.compositionRules || source.composition_rules, config),
    constraints: normalizeRules(source.constraints, config),
    confidence: Math.max(0, Math.min(1, toFiniteNumber(source.confidence, base.confidence))),
    source: sanitizeString(source.source || base.source, 120),
    metadata: isObject(source.metadata) ? source.metadata : {},
    extensions: {
      ...(isObject(source.extensions) ? source.extensions : {}),
      unknownProperties: extensionSource
    }
  };

  if (!normalized.id) {
    normalized.id = `cap-${Math.random().toString(16).slice(2, 10)}`;
  }

  return normalized;
}
