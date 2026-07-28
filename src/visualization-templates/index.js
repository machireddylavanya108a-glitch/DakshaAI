export { createAdaptiveFallbackTemplate } from './VisualizationTemplateSchema.js';
export { normalizeVisualizationTemplate } from './VisualizationTemplateNormalizer.js';
export {
  validateVisualizationTemplate,
  validateTemplateSlots,
  validateTemplateRegions,
  validateTemplateRelationships,
  validateTemplateLayout,
  validateTemplateVariables,
  validateTemplateConditions,
  validateTemplateAccessibility,
  validateTemplatePerformance,
  validateTemplateComposition
} from './VisualizationTemplateValidator.js';
export { repairVisualizationTemplate } from './VisualizationTemplateRepair.js';
export {
  migrateVisualizationTemplate,
  getLatestTemplateVersion,
  isTemplateMigrationRequired,
  registerTemplateMigration,
  listTemplateMigrations
} from './VisualizationTemplateMigration.js';
export { runVisualizationTemplateIntegrityChecks } from './VisualizationTemplateIntegrity.js';
export { processVisualizationTemplate } from './VisualizationTemplateVersionManager.js';
export { createVisualizationTemplateInstance } from './VisualizationTemplateInstance.js';
export { instantiateVisualizationTemplate } from './VisualizationTemplateInstantiation.js';
export {
  serializeVisualizationTemplate,
  exportVisualizationTemplate,
  deepCloneVisualizationTemplate,
  serializeTemplateInstance
} from './VisualizationTemplateSerializer.js';
export {
  deserializeVisualizationTemplate,
  importVisualizationTemplate,
  deserializeTemplateInstance
} from './VisualizationTemplateDeserializer.js';
export { createTemplateFromCapabilityContext, ensureSceneVisualizationTemplateMetadata } from './VisualizationTemplate.js';
export { createVisualizationTemplateDiagnostics, finalizeVisualizationTemplateDiagnostics } from './VisualizationTemplateDiagnostics.js';
export {
  createTemplateSelectionDiagnostics,
  finalizeTemplateSelectionDiagnostics,
  beginSelectionStage,
  endSelectionStage
} from './VisualizationTemplateSelectionDiagnostics.js';
export { normalizeTemplateQuery, matchesTemplateQuery } from './VisualizationTemplateQuery.js';
export {
  VisualizationTemplateRegistry,
  createVisualizationTemplateRegistry,
  defaultVisualizationTemplateRegistry
} from './VisualizationTemplateRegistry.js';
export { evaluateTemplateEligibility } from './VisualizationTemplateEligibility.js';
export { matchVisualizationTemplates } from './VisualizationTemplateMatcher.js';
export { scoreVisualizationTemplateCandidate } from './VisualizationTemplateScorer.js';
export { rankVisualizationTemplates } from './VisualizationTemplateRanker.js';
export { resolveTemplateConflicts } from './VisualizationTemplateConflictResolver.js';
export { resolveTemplateDependencies } from './VisualizationTemplateDependencyResolver.js';
export { composeVisualizationTemplates } from './VisualizationTemplateComposer.js';
export { bindTemplateSlots, bindTemplateRegions, resolveTemplateVariables } from './VisualizationTemplateBinding.js';
export { selectVisualizationTemplate, invalidateTemplateSelectionCache } from './VisualizationTemplateSelection.js';
export {
  VISUALIZATION_TEMPLATE_GENERATOR_VERSION,
  VISUALIZATION_TEMPLATE_GENERATION_DEFAULTS,
  VISUALIZATION_TEMPLATE_PROFILE_LIMITS,
  resolveGenerationConfig,
  normalizeProfile,
  stableHash as stableTemplateGenerationHash
} from './VisualizationTemplateGenerationConfig.js';
export {
  createTemplateGenerationDiagnostics,
  beginGenerationStage,
  endGenerationStage,
  finalizeTemplateGenerationDiagnostics
} from './VisualizationTemplateGenerationDiagnostics.js';
export {
  createTemplateGenerationCacheKey,
  getCachedGeneratedTemplate,
  setCachedGeneratedTemplate,
  invalidateGeneratedTemplateCache,
  clearGeneratedTemplateCache
} from './VisualizationTemplateGenerationCache.js';
export { createVisualizationTemplateBlueprint } from './VisualizationTemplateBlueprint.js';
export { generateTemplateLayout } from './VisualizationTemplateLayoutGenerator.js';
export { generateTemplateSlots } from './VisualizationTemplateSlotGenerator.js';
export { generateTemplateRegions } from './VisualizationTemplateRegionGenerator.js';
export { generateTemplateRelationships } from './VisualizationTemplateRelationshipGenerator.js';
export { simplifyVisualizationTemplate } from './VisualizationTemplateSimplifier.js';
export { refineVisualizationTemplate } from './VisualizationTemplateRefiner.js';
export { salvageVisualizationTemplate } from './VisualizationTemplateSalvager.js';
export { applyTemplateGenerationFallback } from './VisualizationTemplateFallback.js';
export { evaluateVisualizationTemplateQuality } from './VisualizationTemplateQuality.js';
export { generateVisualizationTemplate } from './VisualizationTemplateGenerator.js';
export { VisualizationTemplateError, toVisualizationTemplateError } from './VisualizationTemplateError.js';
export {
  VISUALIZATION_TEMPLATE_LATEST_VERSION,
  VISUALIZATION_TEMPLATE_DEFAULT_LIMITS,
  normalizeVisualizationTemplateConfig
} from './VisualizationTemplateConfig.js';
