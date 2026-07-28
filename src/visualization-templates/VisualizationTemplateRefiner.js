import { simplifyVisualizationTemplate } from './VisualizationTemplateSimplifier.js';
import { evaluateVisualizationTemplateQuality } from './VisualizationTemplateQuality.js';

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizePasses(value, maxPasses = 3) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 2;
  return Math.max(0, Math.min(maxPasses, Math.floor(numeric)));
}

function rebalancePriorities(template = {}) {
  const output = clone(template);
  output.slots = (Array.isArray(output.slots) ? output.slots : [])
    .sort((left, right) => Number(left?.priority || 9999) - Number(right?.priority || 9999) || String(left?.id || '').localeCompare(String(right?.id || '')))
    .map((slot, index) => ({ ...slot, priority: index + 1 }));

  output.regions = (Array.isArray(output.regions) ? output.regions : [])
    .sort((left, right) => Number(left?.accessibilityOrder || 9999) - Number(right?.accessibilityOrder || 9999) || String(left?.id || '').localeCompare(String(right?.id || '')))
    .map((region, index) => ({ ...region, accessibilityOrder: index + 1 }));

  return output;
}

export function refineVisualizationTemplate(template = {}, context = {}, options = {}) {
  const maxPasses = normalizePasses(options.refinementPasses ?? 2, 3);
  const threshold = Number(options.qualityThreshold ?? 65);

  let current = clone(template);
  let passCount = 0;
  let quality = evaluateVisualizationTemplateQuality(current, context, options);
  const notes = [];

  while (passCount < maxPasses && quality.score < threshold) {
    passCount += 1;
    current = rebalancePriorities(current);
    const simplification = simplifyVisualizationTemplate(current, {
      maximumSlots: options.maximumSlots,
      maximumRegions: options.maximumRegions,
      maximumRelationships: options.maximumRelationships,
      reduceMotion: context.accessibilityNeeds?.reducedMotionCompatible === true
    }, options);
    current = simplification.template;
    notes.push(`refinement-pass-${passCount}`);
    notes.push(...simplification.notes.map((item) => `simplification:${item}`));
    quality = evaluateVisualizationTemplateQuality(current, context, options);
  }

  return {
    template: current,
    passes: passCount,
    refined: passCount > 0,
    quality,
    notes
  };
}
