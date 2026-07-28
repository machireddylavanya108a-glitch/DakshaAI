import { normalizeVisualizationCapability } from './VisualizationCapabilityNormalizer.js';
import { validateVisualizationCapability } from './VisualizationCapabilityValidator.js';
import { analyzeVisualizationRequirements } from './VisualizationRequirementAnalyzer.js';
import { generateAdaptiveVisualizationCapability } from './VisualizationCapabilityFallback.js';

function safeObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

export function createVisualizationCapability(input = {}, options = {}) {
  const normalized = normalizeVisualizationCapability(input, options);
  const validation = validateVisualizationCapability(normalized, options);
  return {
    capability: validation.normalizedValue,
    validation
  };
}

export function ensureSceneVisualizationCapabilityMetadata(scene = {}, options = {}) {
  const safeScene = safeObject(scene);
  const metadata = safeObject(safeScene.metadata);
  const existing = safeObject(metadata.visualizationCapabilities);

  if (existing.selectedCapabilities && Array.isArray(existing.selectedCapabilities) && existing.selectedCapabilities.length) {
    return safeScene;
  }

  const requirements = analyzeVisualizationRequirements({
    concepts: safeScene.objects,
    relationships: safeScene.relationships,
    steps: safeScene.timeline,
    goals: safeScene.checkpoints,
    accessibilityNeeds: options.accessibilityNeeds,
    performanceProfile: options.performanceProfile || safeScene?.settings?.quality || 'balanced'
  });

  const fallbackCapability = generateAdaptiveVisualizationCapability(requirements, options);

  return {
    ...safeScene,
    metadata: {
      ...metadata,
      visualizationCapabilities: {
        visualizationRequirements: requirements,
        selectedCapabilities: [fallbackCapability],
        capabilityComposition: {
          primaryCapability: fallbackCapability,
          supportingCapabilities: [],
          optionalCapabilities: [],
          conflicts: [],
          dependencies: [],
          compositionOrder: [{ id: fallbackCapability.id, order: 0, role: 'primary' }],
          sharedDataRequirements: [],
          combinedConstraints: requirements.constraints,
          selectedCapabilities: [fallbackCapability],
          warnings: ['Capability metadata generated from scene structure during compatibility migration.']
        },
        migrationWarning: 'Legacy scene lacked capability metadata; adaptive capability was generated safely.'
      }
    }
  };
}
