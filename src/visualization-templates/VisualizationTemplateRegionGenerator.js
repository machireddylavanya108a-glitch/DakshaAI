import { resolveGenerationConfig, stableSortById } from './VisualizationTemplateGenerationConfig.js';

function clamp(min, value, max) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return min;
  return Math.max(min, Math.min(max, numeric));
}

function regionBounds(order = 0) {
  return {
    x: 0,
    y: order * 0.18,
    width: 1,
    height: clamp(0.2, 1 - order * 0.02, 1),
    depth: 1
  };
}

function collectRegionPurposes(slots = []) {
  const purposes = new Set(['primary']);
  for (const slot of slots) {
    const purpose = String(slot?.purpose || 'supporting-content');
    if (purpose.includes('primary')) purposes.add('primary');
    if (purpose.includes('supporting')) purposes.add('supporting');
    if (purpose.includes('timeline')) purposes.add('timeline');
    if (purpose.includes('interaction')) purposes.add('controls');
    if (purpose.includes('relationship')) purposes.add('relationships');
  }
  return [...purposes];
}

export function generateTemplateRegions(blueprint = {}, slots = [], context = {}, options = {}) {
  const config = resolveGenerationConfig(context, options);
  const purposes = collectRegionPurposes(slots);
  const regions = [];

  purposes.slice(0, config.maximumRegions).forEach((purpose, index) => {
    const id = purpose === 'primary'
      ? 'region-primary'
      : purpose === 'supporting'
        ? 'region-supporting'
        : purpose === 'timeline'
          ? 'region-timeline'
          : purpose === 'controls'
            ? 'region-controls'
            : `region-${purpose}`;

    regions.push({
      id,
      name: `${purpose.charAt(0).toUpperCase()}${purpose.slice(1)} Region`,
      purpose: purpose === 'controls' ? 'interaction-structure' : `${purpose}-structure`,
      bounds: regionBounds(index),
      coordinateSpace: 'normalized',
      anchor: index === 0 ? 'center' : 'top',
      alignment: 'balanced',
      flow: String(blueprint.layoutPlan?.intentHint || 'adaptive'),
      capacity: clamp(1, Math.ceil(slots.length / Math.max(1, purposes.length)), 24),
      priority: index + 1,
      responsiveRules: [{ rule: 'small-screen', behavior: 'stacked' }],
      accessibilityOrder: index + 1,
      metadata: { generated: true },
      extensions: {}
    });
  });

  if (!regions.length) {
    regions.push({
      id: 'region-primary',
      name: 'Primary Region',
      purpose: 'main-structure',
      bounds: regionBounds(0),
      coordinateSpace: 'normalized',
      anchor: 'center',
      alignment: 'balanced',
      flow: 'adaptive',
      capacity: 8,
      priority: 1,
      responsiveRules: [],
      accessibilityOrder: 1,
      metadata: { generated: true },
      extensions: {}
    });
  }

  return stableSortById(regions, 'id');
}
