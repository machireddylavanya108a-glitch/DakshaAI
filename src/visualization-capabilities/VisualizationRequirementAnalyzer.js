import { createVisualizationCapabilityDiagnostics } from './VisualizationCapabilityDiagnostics.js';

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function safeObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function countNestedChildren(items = []) {
  let count = 0;
  const stack = [...items];
  while (stack.length) {
    const current = stack.pop();
    const children = toArray(current?.children);
    if (children.length) {
      count += children.length;
      stack.push(...children);
    }
  }
  return count;
}

function detectComparisonSignal(concepts = [], relationships = []) {
  const complexConcepts = concepts.filter((entry) => entry && typeof entry === 'object');
  if (complexConcepts.length < 2) return false;

  const keySets = complexConcepts.map((item) => new Set(Object.keys(item)));
  const sharedKeys = [...keySets[0]].filter((key) => keySets.every((set) => set.has(key)));
  if (!sharedKeys.length) return false;

  return sharedKeys.some((key) => {
    const values = complexConcepts.map((item) => JSON.stringify(item[key]));
    return new Set(values).size > 1;
  }) || relationships.length > 1;
}

function addRequirement(requirements, patch) {
  requirements.push({
    id: patch.id,
    field: patch.field,
    operator: patch.operator || 'exists',
    expectedValue: patch.expectedValue,
    required: patch.required !== false,
    weight: Number.isFinite(Number(patch.weight)) ? Number(patch.weight) : 1,
    metadata: safeObject(patch.metadata)
  });
}

export function analyzeVisualizationRequirements(input = {}) {
  const startedAt = Date.now();
  const normalized = safeObject(input);

  const concepts = toArray(normalized.concepts || normalized.keyConcepts || normalized.objects);
  const relationships = toArray(normalized.relationships || normalized.edges);
  const steps = toArray(normalized.steps || normalized.lessonSteps || normalized.timeline);
  const goals = toArray(normalized.goals || normalized.learningGoals);
  const examples = toArray(normalized.examples);
  const accessibilityPreferences = safeObject(normalized.accessibilityPreferences || normalized.accessibilityNeeds);

  const requirements = [];
  const detectedPatterns = [];
  const preferredCapabilities = [];
  const constraints = [];
  const warnings = [];

  const relationshipDirectional = relationships.filter((edge) => edge && edge.from && edge.to).length;
  const nestedChildrenCount = countNestedChildren(concepts);
  const hasComparisonSignal = detectComparisonSignal(concepts, relationships);

  if (steps.length > 1) {
    detectedPatterns.push('ordered-structure');
    preferredCapabilities.push('sequence', 'procedure', 'timeline');
    addRequirement(requirements, {
      id: 'req-ordered-steps',
      field: 'steps',
      operator: 'array_min_length',
      expectedValue: 2,
      required: true,
      weight: 2,
      metadata: { evidence: 'multiple steps' }
    });
  }

  if (relationshipDirectional > 1) {
    detectedPatterns.push('directional-relationships');
    preferredCapabilities.push('flow', 'relationship', 'cause-effect');
    addRequirement(requirements, {
      id: 'req-relationships',
      field: 'relationships',
      operator: 'array_min_length',
      expectedValue: 2,
      required: true,
      weight: 2,
      metadata: { evidence: 'multiple directed relationships' }
    });
  }

  if (nestedChildrenCount > 0) {
    detectedPatterns.push('nested-components');
    preferredCapabilities.push('hierarchy', 'structure');
    addRequirement(requirements, {
      id: 'req-hierarchy',
      field: 'components.children',
      operator: 'exists',
      expectedValue: true,
      required: false,
      weight: 1.5,
      metadata: { evidence: 'nested child components' }
    });
  }

  if (hasComparisonSignal) {
    detectedPatterns.push('contrastable-attributes');
    preferredCapabilities.push('comparison', 'classification');
    addRequirement(requirements, {
      id: 'req-comparison',
      field: 'comparisonDimensions',
      operator: 'exists',
      expectedValue: true,
      required: false,
      weight: 1.2,
      metadata: { evidence: 'shared keys with distinct values' }
    });
  }

  if (!requirements.length) {
    warnings.push('No strong structural pattern detected; using conservative exploration requirements.');
    addRequirement(requirements, {
      id: 'req-minimum-concepts',
      field: 'concepts',
      operator: 'array_min_length',
      expectedValue: 1,
      required: false,
      weight: 1,
      metadata: { evidence: 'fallback structural baseline' }
    });
    preferredCapabilities.push('exploration', 'inspection', 'demonstration');
  }

  const performanceProfile = String(
    normalized.performanceProfile || normalized.performanceNeeds?.profile || 'balanced'
  ).toLowerCase().trim();

  constraints.push({
    id: 'constraint-performance-profile',
    field: 'performanceProfile',
    operator: 'in',
    expectedValue: ['low', 'balanced', 'high', 'auto'],
    required: true,
    weight: 1,
    metadata: { selected: performanceProfile }
  });

  const accessibilityNeeds = {
    textAlternativeRequired: accessibilityPreferences.textAlternativeRequired !== false,
    keyboardCompatible: accessibilityPreferences.keyboardCompatible !== false,
    reducedMotionCompatible: accessibilityPreferences.reducedMotionCompatible !== false,
    highContrastCompatible: accessibilityPreferences.highContrastCompatible !== false
  };

  const confidenceBase = 0.35 + Math.min(0.5, (detectedPatterns.length * 0.12));
  const confidence = Math.max(0.2, Math.min(0.95, confidenceBase));

  const diagnostics = createVisualizationCapabilityDiagnostics();
  diagnostics.analysisDuration = Math.max(0, Date.now() - startedAt);
  diagnostics.confidence = confidence;
  diagnostics.candidateCount = 0;

  return {
    requirements,
    detectedPatterns,
    preferredCapabilities: [...new Set(preferredCapabilities)],
    constraints,
    accessibilityNeeds,
    performanceNeeds: {
      profile: performanceProfile,
      mobile: normalized.learnerContext?.deviceType === 'mobile'
    },
    confidence,
    warnings,
    diagnostics,
    contextSummary: {
      conceptCount: concepts.length,
      relationshipCount: relationships.length,
      stepCount: steps.length,
      goalCount: goals.length,
      exampleCount: examples.length
    }
  };
}
