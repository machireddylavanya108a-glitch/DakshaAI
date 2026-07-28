import { createVisualizationCapabilityRegistry } from './VisualizationCapabilityRegistry.js';
import { createVisualizationCapability } from './VisualizationCapability.js';
import { analyzeVisualizationRequirements } from './VisualizationRequirementAnalyzer.js';
import { matchVisualizationCapabilities } from './VisualizationCapabilityMatcher.js';
import { composeVisualizationCapabilities } from './VisualizationCapabilityComposer.js';
import { generateAdaptiveVisualizationCapability } from './VisualizationCapabilityFallback.js';
import { createVisualizationCapabilityDiagnostics, finalizeCapabilityDiagnostics } from './VisualizationCapabilityDiagnostics.js';
import { normalizeVisualizationCapabilityConfig } from './VisualizationCapabilityConfig.js';
import { scoreVisualizationCapabilityMatch } from './VisualizationCapabilityScorer.js';

function getSeedCapabilities() {
  return [
    {
      id: 'cap-sequence-flow',
      name: 'Sequence Flow Capability',
      semanticPurpose: 'sequence',
      description: 'Supports ordered conceptual progressions and process walkthroughs.',
      supportedLearningActions: ['observe', 'sequence', 'trace', 'explain'],
      inputRequirements: [{ id: 'req-steps', field: 'stepCount', operator: 'gte', expectedValue: 2, required: true, weight: 2 }],
      confidence: 0.72,
      source: 'built-in-seed'
    },
    {
      id: 'cap-relationship-structure',
      name: 'Relationship Structure Capability',
      semanticPurpose: 'relationship',
      description: 'Supports relational and structural understanding between entities.',
      supportedLearningActions: ['inspect', 'compare', 'navigate', 'classify'],
      inputRequirements: [{ id: 'req-relationships', field: 'relationshipCount', operator: 'gte', expectedValue: 1, required: true, weight: 2 }],
      confidence: 0.7,
      source: 'built-in-seed'
    }
  ];
}

export function createSeededVisualizationCapabilityRegistry(options = {}) {
  const registry = createVisualizationCapabilityRegistry(options);
  if (options.includeSeedCapabilities === false) return registry;

  getSeedCapabilities().forEach((capability) => {
    try {
      registry.registerCapability(capability);
    } catch {
      // Keep registry resilient if a seed descriptor fails validation.
    }
  });

  return registry;
}

const defaultVisualizationCapabilityRegistry = createSeededVisualizationCapabilityRegistry();

export function resolveVisualizationCapabilities(input = {}, options = {}) {
  const config = normalizeVisualizationCapabilityConfig(options);
  const diagnostics = createVisualizationCapabilityDiagnostics({
    registrySize: options.registry?.listCapabilities?.().length || defaultVisualizationCapabilityRegistry.listCapabilities().length
  });

  const requirements = analyzeVisualizationRequirements(input);
  const registry = options.registry || defaultVisualizationCapabilityRegistry;
  const matches = matchVisualizationCapabilities(requirements, registry, config);
  const composition = composeVisualizationCapabilities(matches, requirements, config);

  let selectedCapabilities = composition.selectedCapabilities;
  let fallbackUsed = false;

  if (!selectedCapabilities.length) {
    fallbackUsed = true;
    selectedCapabilities = [generateAdaptiveVisualizationCapability(requirements, config)];
  }

  const selectedCapabilityIds = selectedCapabilities.map((capability) => capability.id);
  const unmetRequirementCount = matches.reduce((sum, item) => sum + Number(item.unmetRequirements || 0), 0);

  finalizeCapabilityDiagnostics(diagnostics, {
    candidateCount: matches.length,
    matchedCount: matches.length,
    compositionCount: selectedCapabilities.length,
    fallbackUsed,
    confidence: Number(requirements.confidence || 0),
    selectedCapabilityIds,
    unmetRequirementCount,
    accessibilityCoverage: selectedCapabilities.length
      ? Number((selectedCapabilities.filter((item) => item?.accessibilityProperties?.textAlternativeRequired !== false).length / selectedCapabilities.length).toFixed(3))
      : 0,
    performanceCompatibility: selectedCapabilities.length
      ? Number((selectedCapabilities.filter((item) => item?.performanceProperties?.minimumProfile).length / selectedCapabilities.length).toFixed(3))
      : 0,
    warnings: [...requirements.warnings, ...(composition.warnings || [])]
  });

  return {
    visualizationRequirements: requirements,
    selectedCapabilities,
    capabilityComposition: {
      ...composition,
      selectedCapabilities
    },
    matches,
    diagnostics
  };
}

export {
  createVisualizationCapability,
  createVisualizationCapabilityRegistry,
  analyzeVisualizationRequirements,
  matchVisualizationCapabilities,
  composeVisualizationCapabilities,
  scoreVisualizationCapabilityMatch,
  generateAdaptiveVisualizationCapability,
  createVisualizationCapabilityDiagnostics,
  normalizeVisualizationCapabilityConfig,
  defaultVisualizationCapabilityRegistry
};

export * from './VisualizationCapabilitySchema.js';
export * from './VisualizationCapabilityNormalizer.js';
export * from './VisualizationCapabilityValidator.js';
export * from './VisualizationCapabilityError.js';
