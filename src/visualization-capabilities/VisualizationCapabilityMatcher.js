import { scoreVisualizationCapabilityMatch } from './VisualizationCapabilityScorer.js';
import { generateAdaptiveVisualizationCapability } from './VisualizationCapabilityFallback.js';
import { normalizeVisualizationCapabilityConfig } from './VisualizationCapabilityConfig.js';

function toCapabilities(registry) {
  if (Array.isArray(registry)) return registry;
  if (registry && typeof registry.listCapabilities === 'function') {
    return registry.listCapabilities();
  }
  return [];
}

export function matchVisualizationCapabilities(requirements = {}, registry, options = {}) {
  const config = normalizeVisualizationCapabilityConfig(options);
  const capabilities = toCapabilities(registry);

  if (!capabilities.length) {
    const fallback = generateAdaptiveVisualizationCapability(requirements, options);
    return [{
      capability: fallback,
      score: 35,
      confidence: fallback.confidence,
      matchedRequirements: 0,
      unmetRequirements: 0,
      warnings: ['No registered capabilities available; adaptive fallback was generated.'],
      explanation: 'fallback-generated'
    }];
  }

  const matches = capabilities.map((capability) => {
    const scored = scoreVisualizationCapabilityMatch(capability, requirements, config);
    return {
      capability,
      score: scored.score,
      confidence: scored.confidence,
      matchedRequirements: scored.matchedRequirements,
      unmetRequirements: scored.unmetRequirements,
      warnings: scored.unmetRequirements > 0 ? ['Some required capability inputs are not fully satisfied.'] : [],
      explanation: scored.explanation
    };
  });

  return matches
    .sort((a, b) => b.score - a.score || b.confidence - a.confidence || String(a.capability.id).localeCompare(String(b.capability.id)))
    .filter((item) => item.score >= config.minimumMatchScore || options.includeLowScore === true);
}
