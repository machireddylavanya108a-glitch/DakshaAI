export const VISUALIZATION_CAPABILITY_DEFAULTS = {
  maxStringLength: 1200,
  maxDescriptionLength: 4000,
  maxRuleCount: 120,
  maxActionCount: 80,
  maxCapabilityCount: 500,
  scoreRangeMin: 0,
  scoreRangeMax: 100,
  minimumMatchScore: 20,
  maxSupportingCapabilities: 4,
  performanceProfiles: ['low', 'balanced', 'high', 'auto']
};

export const DEFAULT_SCORING_WEIGHTS = {
  semanticCompatibility: 22,
  inputRequirements: 20,
  learningActions: 12,
  spatialCompatibility: 8,
  temporalCompatibility: 8,
  interactionCompatibility: 8,
  accessibilityCompatibility: 10,
  performanceCompatibility: 8,
  compositionCompatibility: 2,
  confidence: 2
};

export function normalizeVisualizationCapabilityConfig(input = {}) {
  const value = input && typeof input === 'object' ? input : {};
  return {
    ...VISUALIZATION_CAPABILITY_DEFAULTS,
    ...value,
    scoringWeights: {
      ...DEFAULT_SCORING_WEIGHTS,
      ...(value.scoringWeights && typeof value.scoringWeights === 'object' ? value.scoringWeights : {})
    }
  };
}
