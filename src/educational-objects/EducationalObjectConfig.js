export const EDUCATIONAL_OBJECT_LATEST_VERSION = 'v1';

export const EDUCATIONAL_OBJECT_DEFAULT_LIMITS = {
  maxLabels: 64,
  maxVariables: 64,
  maxConditions: 64,
  maxConceptReferences: 128,
  maxRelationshipReferences: 256,
  maxCapabilityReferences: 64,
  maxTemplateBindings: 64,
  maxArrayLength: 1000,
  maxStringLength: 4000,
  maxIdentifierLength: 160,
  maxExtensionDepth: 12,
  maxNestingDepth: 20
};

export const EDUCATIONAL_OBJECT_DEFAULTS = {
  source: 'runtime',
  status: 'active',
  kind: 'generic-educational-object',
  semanticRole: 'adaptive-role',
  learningPurpose: 'inspect',
  performanceProfiles: ['low', 'balanced', 'high', 'auto']
};

function toPositiveInt(value, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return fallback;
  return Math.round(numeric);
}

export function normalizeEducationalObjectConfig(input = {}) {
  const source = input && typeof input === 'object' ? input : {};
  const limits = {
    ...EDUCATIONAL_OBJECT_DEFAULT_LIMITS,
    ...(source.limits && typeof source.limits === 'object' ? source.limits : {})
  };

  return {
    ...EDUCATIONAL_OBJECT_DEFAULTS,
    ...source,
    limits: {
      maxLabels: toPositiveInt(limits.maxLabels, EDUCATIONAL_OBJECT_DEFAULT_LIMITS.maxLabels),
      maxVariables: toPositiveInt(limits.maxVariables, EDUCATIONAL_OBJECT_DEFAULT_LIMITS.maxVariables),
      maxConditions: toPositiveInt(limits.maxConditions, EDUCATIONAL_OBJECT_DEFAULT_LIMITS.maxConditions),
      maxConceptReferences: toPositiveInt(limits.maxConceptReferences, EDUCATIONAL_OBJECT_DEFAULT_LIMITS.maxConceptReferences),
      maxRelationshipReferences: toPositiveInt(limits.maxRelationshipReferences, EDUCATIONAL_OBJECT_DEFAULT_LIMITS.maxRelationshipReferences),
      maxCapabilityReferences: toPositiveInt(limits.maxCapabilityReferences, EDUCATIONAL_OBJECT_DEFAULT_LIMITS.maxCapabilityReferences),
      maxTemplateBindings: toPositiveInt(limits.maxTemplateBindings, EDUCATIONAL_OBJECT_DEFAULT_LIMITS.maxTemplateBindings),
      maxArrayLength: toPositiveInt(limits.maxArrayLength, EDUCATIONAL_OBJECT_DEFAULT_LIMITS.maxArrayLength),
      maxStringLength: toPositiveInt(limits.maxStringLength, EDUCATIONAL_OBJECT_DEFAULT_LIMITS.maxStringLength),
      maxIdentifierLength: toPositiveInt(limits.maxIdentifierLength, EDUCATIONAL_OBJECT_DEFAULT_LIMITS.maxIdentifierLength),
      maxExtensionDepth: toPositiveInt(limits.maxExtensionDepth, EDUCATIONAL_OBJECT_DEFAULT_LIMITS.maxExtensionDepth),
      maxNestingDepth: toPositiveInt(limits.maxNestingDepth, EDUCATIONAL_OBJECT_DEFAULT_LIMITS.maxNestingDepth)
    }
  };
}
