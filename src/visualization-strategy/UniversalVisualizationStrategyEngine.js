import { analyzeUniversalLearningIntent } from '../intent-analysis/index.js';

const STORE_KEY = '__daksha_visualization_strategy_store__';
const STRATEGY_SCHEMA_VERSION = 'v2';
const ENGINE_PERSISTENCE_KEY = 'daksha.universal.visualization.strategy.v2';

function safeString(value) {
  return String(value || '').trim();
}

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function toFiniteNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value, minimum = 0, maximum = 1) {
  return Math.min(Math.max(toFiniteNumber(value, minimum), minimum), maximum);
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function sanitizeText(value = '') {
  return safeString(value)
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(value = '') {
  return sanitizeText(value)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function createInMemoryStore() {
  if (!globalThis[STORE_KEY]) {
    globalThis[STORE_KEY] = new Map();
  }

  const store = globalThis[STORE_KEY];
  return {
    setItem(key, value) {
      store.set(String(key), String(value));
    },
    getItem(key) {
      return store.get(String(key)) || null;
    },
    removeItem(key) {
      store.delete(String(key));
    }
  };
}

function createDefaultPersistenceAdapter() {
  const local = globalThis?.localStorage;
  if (local && typeof local.getItem === 'function' && typeof local.setItem === 'function') {
    return local;
  }

  return createInMemoryStore();
}

function parsePayload(value) {
  if (!value) return null;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  return isObject(value) ? value : null;
}

function hashKey(input = '') {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = ((hash << 5) - hash + input.charCodeAt(index)) | 0;
  }
  return Math.abs(hash).toString(16);
}

function buildCacheKey(input = {}, intent = {}) {
  const payload = JSON.stringify({
    sourceType: safeString(input.sourceType || input.type || 'text').toLowerCase(),
    sourceName: safeString(input.sourceName || input.filename || ''),
    content: sanitizeText(input.content || input.text || input.rawExtractedContent || input.extractedText || '').slice(0, 3000),
    visualDescription: sanitizeText(input.visualDescription || input.visionSummary || '').slice(0, 1200),
    intent: {
      learningIntent: safeString(intent.learningIntent),
      domain: safeString(intent.knowledgeDomain),
      strategy: safeString(intent.educationalStrategy),
      reasoning: safeString(intent.reasoningStyle),
      confidence: Number(intent.confidenceScore || 0)
    }
  });

  return `viz-strategy-${hashKey(payload)}`;
}

function uniqueStrings(values = []) {
  const seen = new Set();
  const output = [];

  values.forEach((value) => {
    const text = safeString(value);
    if (!text) return;
    const key = text.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    output.push(text);
  });

  return output;
}

function toTitleCase(value = '') {
  return safeString(value)
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function scoreSignals(tokens = [], regexList = []) {
  return regexList.reduce((score, expression) => {
    return score + tokens.filter((token) => expression.test(token)).length;
  }, 0);
}

function deriveStructureSignals(content = '') {
  const source = String(content || '');
  const lines = source.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const headings = lines.filter((line) => /^(#|chapter|section|unit|part|topic)\b/i.test(line)).length;
  const listItems = lines.filter((line) => /^(-|\*|\d+\.)\s+/.test(line)).length;
  const equations = (source.match(/(=|\btheorem\b|\bproof\b|\bintegral\b|\bderivative\b)/gi) || []).length;
  const codeBlocks = (source.match(/(```[\s\S]*?```|\b(function|class|const|let|var|def|import|interface)\b)/g) || []).length;
  const timelineSignals = (source.match(/\b(before|after|step|phase|sequence|timeline|chronology|history)\b/gi) || []).length;
  const comparisonSignals = (source.match(/\b(compare|contrast|difference|versus|tradeoff)\b/gi) || []).length;
  const simulationSignals = (source.match(/\b(simulate|scenario|model|experiment|observe|virtual lab|hypothesis)\b/gi) || []).length;

  return {
    headings,
    listItems,
    equations,
    codeBlocks,
    timelineSignals,
    comparisonSignals,
    simulationSignals
  };
}

function derivePrimaryVisualizationStyle(intent = {}, tokens = [], signals = {}) {
  const intentText = `${safeString(intent.learningIntent)} ${safeString(intent.educationalStrategy)} ${safeString(intent.reasoningStyle)}`.toLowerCase();
  const tokenScoreTimeline = scoreSignals(tokens, [/timeline/, /sequence/, /chronology/, /phase/, /workflow/]) + signals.timelineSignals;
  const tokenScoreSimulation = scoreSignals(tokens, [/simulate/, /model/, /experiment/, /virtual/, /lab/]) + signals.simulationSignals;
  const tokenScoreComparison = scoreSignals(tokens, [/compare/, /contrast/, /versus/, /tradeoff/]) + signals.comparisonSignals;
  const tokenScoreGraph = scoreSignals(tokens, [/graph/, /relationship/, /network/, /dependency/, /concept/]);
  const tokenScoreProcedure = scoreSignals(tokens, [/step/, /process/, /procedure/, /pipeline/, /algorithm/]);

  const scores = [
    { style: 'adaptive visualization', score: 1 + (intent.confidenceScore || 0) },
    { style: 'timeline', score: tokenScoreTimeline + (/timeline|sequence/.test(intentText) ? 2 : 0) },
    { style: 'simulation', score: tokenScoreSimulation + (/simulate|model/.test(intentText) ? 2 : 0) },
    { style: 'comparison', score: tokenScoreComparison + (/comparative/.test(intentText) ? 2 : 0) },
    { style: 'concept graph', score: tokenScoreGraph + (/relationship|reason/.test(intentText) ? 1 : 0) },
    { style: 'workflow', score: tokenScoreProcedure + (/procedure|process/.test(intentText) ? 1 : 0) }
  ].sort((a, b) => b.score - a.score);

  const winner = scores[0] || { style: 'adaptive visualization', score: 1 };
  return {
    style: winner.style,
    evidenceScore: winner.score,
    allScores: scores
  };
}

function deriveComplexityLevel(tokens = [], signals = {}) {
  const breadth = new Set(tokens).size;
  const structuralWeight = signals.headings + signals.listItems * 0.5 + signals.codeBlocks * 1.8 + signals.equations * 1.2;
  const raw = breadth / 35 + structuralWeight;

  if (raw >= 12) return 'high';
  if (raw >= 6) return 'medium';
  return 'low';
}

function deriveInteractionLevel(intent = {}, signals = {}) {
  const intentText = safeString(intent.learningIntent).toLowerCase();
  const explicitInteractive = /build|debug|practice|simulate|explore|interact|compare/.test(intentText);
  const signal = signals.codeBlocks + signals.simulationSignals + signals.comparisonSignals;

  if (explicitInteractive && signal >= 3) return 'high';
  if (explicitInteractive || signal >= 1) return 'medium';
  return 'low';
}

function deriveAnimationIntensity(style = '', complexity = 'medium', interactionLevel = 'medium') {
  const styleLower = safeString(style).toLowerCase();
  const isMotionOriented = /timeline|workflow|simulation|procedural/.test(styleLower);
  if (isMotionOriented && (complexity === 'high' || interactionLevel === 'high')) return 'high';
  if (isMotionOriented || complexity === 'medium') return 'medium';
  return 'low';
}

function deriveCameraStrategy(style = '', interactionLevel = 'medium') {
  const styleLower = safeString(style).toLowerCase();
  if (/timeline|workflow/.test(styleLower)) return 'sequenced-focus-camera';
  if (/comparison/.test(styleLower)) return 'split-focus-camera';
  if (/simulation|virtual laboratory/.test(styleLower)) return interactionLevel === 'high' ? 'exploratory-orbit-camera' : 'guided-orbit-camera';
  if (/concept graph/.test(styleLower)) return 'graph-context-camera';
  return 'adaptive-context-camera';
}

function deriveNarrationStrategy(intent = {}, interactionLevel = 'medium') {
  const reasoning = safeString(intent.reasoningStyle).toLowerCase();
  if (reasoning === 'comparative') return 'compare-and-explain narration';
  if (reasoning === 'procedural') return 'stepwise narration';
  if (interactionLevel === 'high') return 'coach-style narration';
  return 'concept-first narration';
}

function deriveTimelineStrategy(style = '', signals = {}) {
  const styleLower = safeString(style).toLowerCase();
  if (/timeline|workflow|procedural/.test(styleLower)) return 'ordered-sequence';
  if (/comparison/.test(styleLower)) return 'parallel-branches';
  if (/concept graph/.test(styleLower)) return 'dependency-linked';
  if (signals.timelineSignals > 0) return 'event-driven-adaptive';
  return 'checkpoint-driven';
}

function deriveObjectDensity(complexity = 'medium', signals = {}) {
  const signal = signals.headings + signals.listItems + signals.codeBlocks + signals.equations;
  if (complexity === 'high' || signal >= 12) return 'high';
  if (complexity === 'medium' || signal >= 6) return 'medium';
  return 'low';
}

function deriveRenderingPriority(style = '', interactionLevel = 'medium') {
  const styleLower = safeString(style).toLowerCase();
  if (/simulation|virtual laboratory/.test(styleLower)) return 'interaction-fidelity-first';
  if (/comparison|concept graph/.test(styleLower)) return 'clarity-first';
  if (interactionLevel === 'high') return 'responsiveness-first';
  return 'balanced';
}

function deriveSimulationRequirements(style = '', intent = {}, signals = {}) {
  const styleLower = safeString(style).toLowerCase();
  const shouldSimulate = /simulation|virtual laboratory/.test(styleLower)
    || /simulate|model|experiment/.test(safeString(intent.learningIntent).toLowerCase())
    || signals.simulationSignals > 0;

  return {
    required: shouldSimulate,
    mode: shouldSimulate ? 'state-transition-simulation' : 'not-required',
    parameters: shouldSimulate
      ? {
          supportsUnknownStates: true,
          progressionModel: 'adaptive',
          interactionDriven: true
        }
      : {
          supportsUnknownStates: true,
          progressionModel: 'n/a',
          interactionDriven: false
        }
  };
}

function deriveLearningMode(intent = {}, interactionLevel = 'medium') {
  const strategy = safeString(intent.educationalStrategy).toLowerCase();
  if (/evidence|critical/.test(strategy)) return 'analytical-learning';
  if (/code|implementation/.test(strategy)) return 'hands-on-learning';
  if (interactionLevel === 'high') return 'interactive-learning';
  return 'guided-learning';
}

function deriveReasoningStrategy(intent = {}, style = '') {
  const reasoning = safeString(intent.reasoningStyle) || 'conceptual';
  const styleLower = safeString(style).toLowerCase();
  if (reasoning.toLowerCase() === 'comparative' || /comparison/.test(styleLower)) return 'comparative-reasoning';
  if (reasoning.toLowerCase() === 'procedural' || /workflow|timeline/.test(styleLower)) return 'procedural-reasoning';
  if (reasoning.toLowerCase() === 'analytical' || /concept graph/.test(styleLower)) return 'analytical-reasoning';
  return 'conceptual-reasoning';
}

function deriveConfidence(intent = {}, signals = {}, primaryScore = 1) {
  const signalStrength = signals.headings + signals.listItems + signals.codeBlocks + signals.equations + signals.timelineSignals + signals.comparisonSignals;
  return clamp((intent.confidenceScore || 0.4) * 0.65 + clamp(signalStrength / 20, 0, 1) * 0.2 + clamp(primaryScore / 10, 0, 1) * 0.15, 0, 1);
}

function normalizeSimulationRequirements(value = {}) {
  const source = isObject(value) ? value : {};
  return {
    required: source.required === true,
    mode: safeString(source.mode) || (source.required ? 'state-transition-simulation' : 'not-required'),
    parameters: isObject(source.parameters) ? source.parameters : {
      supportsUnknownStates: true,
      progressionModel: source.required ? 'adaptive' : 'n/a',
      interactionDriven: source.required === true
    }
  };
}

export function normalizeStrategyEntry(entry = {}) {
  const source = isObject(entry) ? entry : {};
  return {
    strategyId: safeString(source.strategyId) || `strategy-${Date.now()}`,
    visualizationStyle: safeString(source.visualizationStyle) || 'adaptive visualization',
    sceneComplexity: safeString(source.sceneComplexity) || 'medium',
    interactionLevel: safeString(source.interactionLevel) || 'medium',
    animationIntensity: safeString(source.animationIntensity) || 'medium',
    cameraStrategy: safeString(source.cameraStrategy) || 'adaptive-context-camera',
    narrationStrategy: safeString(source.narrationStrategy) || 'concept-first narration',
    timelineStrategy: safeString(source.timelineStrategy) || 'checkpoint-driven',
    objectDensity: safeString(source.objectDensity) || 'medium',
    renderingPriority: safeString(source.renderingPriority) || 'balanced',
    simulationRequirements: normalizeSimulationRequirements(source.simulationRequirements),
    learningMode: safeString(source.learningMode) || 'guided-learning',
    reasoningStrategy: safeString(source.reasoningStrategy) || 'conceptual-reasoning',
    confidenceScore: clamp(source.confidenceScore, 0, 1),
    metadata: isObject(source.metadata) ? source.metadata : {},
    evidence: isObject(source.evidence) ? source.evidence : {}
  };
}

function normalizeStrategyList(list = []) {
  return asArray(list)
    .map((entry) => normalizeStrategyEntry(entry))
    .sort((a, b) => b.confidenceScore - a.confidenceScore);
}

export function migrateVisualizationStrategyProfile(profile = {}) {
  const source = isObject(profile) ? profile : {};

  if (source.schemaVersion === STRATEGY_SCHEMA_VERSION) {
    return {
      ...source,
      strategies: normalizeStrategyList(source.strategies),
      primaryStrategy: normalizeStrategyEntry(source.primaryStrategy || source.strategies?.[0] || {})
    };
  }

  const legacyPrimary = source.primaryStyle || source.primaryStrategy || {};
  const legacyStrategies = Array.isArray(source.strategies)
    ? source.strategies
    : [
      {
        strategyId: safeString(legacyPrimary.strategyId) || 'strategy-legacy-primary',
        visualizationStyle: safeString(legacyPrimary.visualizationStyle || legacyPrimary.style || source.style || 'adaptive visualization'),
        sceneComplexity: safeString(legacyPrimary.sceneComplexity || source.sceneComplexity || 'medium'),
        interactionLevel: safeString(legacyPrimary.interactionLevel || source.interactionLevel || 'medium'),
        animationIntensity: safeString(legacyPrimary.animationIntensity || source.animationIntensity || 'medium'),
        cameraStrategy: safeString(legacyPrimary.cameraStrategy || source.cameraStrategy || 'adaptive-context-camera'),
        narrationStrategy: safeString(legacyPrimary.narrationStrategy || source.narrationStrategy || 'concept-first narration'),
        timelineStrategy: safeString(legacyPrimary.timelineStrategy || source.timelineStrategy || 'checkpoint-driven'),
        objectDensity: safeString(legacyPrimary.objectDensity || source.objectDensity || 'medium'),
        renderingPriority: safeString(legacyPrimary.renderingPriority || source.renderingPriority || 'balanced'),
        simulationRequirements: normalizeSimulationRequirements(legacyPrimary.simulationRequirements || source.simulationRequirements || {}),
        learningMode: safeString(legacyPrimary.learningMode || source.learningMode || 'guided-learning'),
        reasoningStrategy: safeString(legacyPrimary.reasoningStrategy || source.reasoningStrategy || 'conceptual-reasoning'),
        confidenceScore: clamp(legacyPrimary.confidenceScore || source.confidenceScore, 0, 1),
        metadata: {
          migratedFrom: source.schemaVersion || 'legacy',
          migrationReason: 'backward-compatibility'
        }
      }
    ];

  return normalizeVisualizationStrategyProfile({
    schemaVersion: STRATEGY_SCHEMA_VERSION,
    primaryStrategy: legacyStrategies[0],
    strategies: legacyStrategies,
    confidenceScore: clamp(source.confidenceScore || legacyStrategies[0]?.confidenceScore || 0.45, 0, 1),
    diagnostics: {
      migrated: true,
      sourceVersion: source.schemaVersion || 'legacy'
    },
    cache: source.cache || {},
    metadata: {
      ...(isObject(source.metadata) ? source.metadata : {}),
      migrationApplied: true
    }
  });
}

export function normalizeVisualizationStrategyProfile(profile = {}) {
  const source = isObject(profile) ? profile : {};
  const strategies = normalizeStrategyList(source.strategies || []);
  const primaryStrategy = normalizeStrategyEntry(source.primaryStrategy || strategies[0] || {});

  const safeStrategies = strategies.length ? strategies : [primaryStrategy];

  return {
    schemaVersion: STRATEGY_SCHEMA_VERSION,
    primaryStrategy,
    strategies: safeStrategies,
    confidenceScore: clamp(source.confidenceScore || primaryStrategy.confidenceScore || 0.45, 0, 1),
    diagnostics: isObject(source.diagnostics) ? source.diagnostics : {},
    cache: isObject(source.cache) ? source.cache : {},
    metadata: isObject(source.metadata) ? source.metadata : {}
  };
}

function buildStrategyCandidates(intent = {}, tokens = [], signals = {}, sourceType = 'text') {
  const primary = derivePrimaryVisualizationStyle(intent, tokens, signals);
  const complexity = deriveComplexityLevel(tokens, signals);
  const interactionLevel = deriveInteractionLevel(intent, signals);

  const primaryEntry = normalizeStrategyEntry({
    strategyId: 'strategy-primary',
    visualizationStyle: primary.style,
    sceneComplexity: complexity,
    interactionLevel,
    animationIntensity: deriveAnimationIntensity(primary.style, complexity, interactionLevel),
    cameraStrategy: deriveCameraStrategy(primary.style, interactionLevel),
    narrationStrategy: deriveNarrationStrategy(intent, interactionLevel),
    timelineStrategy: deriveTimelineStrategy(primary.style, signals),
    objectDensity: deriveObjectDensity(complexity, signals),
    renderingPriority: deriveRenderingPriority(primary.style, interactionLevel),
    simulationRequirements: deriveSimulationRequirements(primary.style, intent, signals),
    learningMode: deriveLearningMode(intent, interactionLevel),
    reasoningStrategy: deriveReasoningStrategy(intent, primary.style),
    confidenceScore: deriveConfidence(intent, signals, primary.evidenceScore),
    evidence: {
      signalSummary: signals,
      reasoningStyle: intent.reasoningStyle,
      educationalStrategy: intent.educationalStrategy,
      sourceType
    }
  });

  const styleUniverse = uniqueStrings([
    primary.style,
    ...(intent.learningPathway || [])
      .map((entry) => safeString(entry).toLowerCase())
      .flatMap((entry) => {
        const styles = [];
        if (entry.includes('sequence') || entry.includes('checkpoint')) styles.push('timeline');
        if (entry.includes('practice') || entry.includes('interaction')) styles.push('interactive scene');
        if (entry.includes('graph') || entry.includes('anchor')) styles.push('concept graph');
        if (entry.includes('strategy') || entry.includes('workflow')) styles.push('workflow');
        if (entry.includes('simulate') || entry.includes('model')) styles.push('simulation');
        return styles;
      }),
    signals.simulationSignals > 0 ? 'virtual laboratory' : '',
    signals.comparisonSignals > 0 ? 'comparison' : '',
    signals.timelineSignals > 0 ? 'timeline' : '',
    signals.codeBlocks > 0 ? 'procedural animation' : '',
    sourceType === 'image' ? 'diagram' : '',
    sourceType === 'research-paper' ? 'abstract visualization' : '',
    'hybrid visualization',
    'adaptive visualization'
  ]).slice(0, 8);

  const alternatives = styleUniverse
    .map((style, index) => {
      const alternativeInteraction = index % 2 === 0 ? interactionLevel : (interactionLevel === 'high' ? 'medium' : 'high');
      return normalizeStrategyEntry({
        strategyId: `strategy-${index + 2}`,
        visualizationStyle: style,
        sceneComplexity: complexity,
        interactionLevel: alternativeInteraction,
        animationIntensity: deriveAnimationIntensity(style, complexity, alternativeInteraction),
        cameraStrategy: deriveCameraStrategy(style, alternativeInteraction),
        narrationStrategy: deriveNarrationStrategy(intent, alternativeInteraction),
        timelineStrategy: deriveTimelineStrategy(style, signals),
        objectDensity: deriveObjectDensity(complexity, signals),
        renderingPriority: deriveRenderingPriority(style, alternativeInteraction),
        simulationRequirements: deriveSimulationRequirements(style, intent, signals),
        learningMode: deriveLearningMode(intent, alternativeInteraction),
        reasoningStrategy: deriveReasoningStrategy(intent, style),
        confidenceScore: clamp(primaryEntry.confidenceScore - ((index + 1) * 0.04), 0.12, 0.98),
        metadata: {
          generatedAlternative: true
        },
        evidence: {
          source: 'adaptive-style-derivation',
          sourceType,
          styleIndex: index + 1
        }
      });
    })
    .filter((entry) => safeString(entry.visualizationStyle).length > 0);

  const strategies = [primaryEntry, ...alternatives]
    .sort((a, b) => b.confidenceScore - a.confidenceScore)
    .slice(0, 10);

  return {
    primary: strategies[0],
    strategies
  };
}

export class UniversalVisualizationStrategyEngine {
  constructor(options = {}) {
    this.options = isObject(options) ? options : {};
    this.persistenceAdapter = this.options.persistenceAdapter || createDefaultPersistenceAdapter();
    this.persistenceKey = safeString(this.options.persistenceKey) || ENGINE_PERSISTENCE_KEY;
    this.cache = new Map();
    this.diagnostics = {
      analyses: 0,
      cacheHits: 0,
      cacheMisses: 0,
      recoveries: 0,
      warnings: []
    };

    this.recoverCache();
  }

  warn(message = 'Unknown warning') {
    this.diagnostics.warnings.push(safeString(message));
    if (this.diagnostics.warnings.length > 200) {
      this.diagnostics.warnings.shift();
    }
  }

  analyze(input = {}) {
    this.diagnostics.analyses += 1;

    const sourceType = safeString(input.sourceType || input.type || 'text').toLowerCase() || 'text';
    const content = sanitizeText(input.content || input.text || input.rawExtractedContent || input.extractedText || '');
    const visualDescription = sanitizeText(input.visualDescription || input.visionSummary || '');
    const mergedContent = [content, visualDescription].filter(Boolean).join(' ');

    const intent = isObject(input.intent)
      ? input.intent
      : analyzeUniversalLearningIntent({
        sourceType,
        sourceName: input.sourceName,
        content: mergedContent,
        visualDescription
      });

    const cacheKey = buildCacheKey({ ...input, sourceType, content: mergedContent, visualDescription }, intent);
    if (this.cache.has(cacheKey)) {
      this.diagnostics.cacheHits += 1;
      return deepClone(this.cache.get(cacheKey));
    }

    this.diagnostics.cacheMisses += 1;

    const tokens = tokenize(mergedContent || input.sourceName || '');
    const signals = deriveStructureSignals(mergedContent);
    const candidates = buildStrategyCandidates(intent, tokens, signals, sourceType);

    const profile = normalizeVisualizationStrategyProfile({
      schemaVersion: STRATEGY_SCHEMA_VERSION,
      primaryStrategy: candidates.primary,
      strategies: candidates.strategies,
      confidenceScore: candidates.primary.confidenceScore,
      diagnostics: {
        tokenCount: tokens.length,
        structureSignals: signals,
        sourceType,
        styleCandidates: candidates.strategies.map((entry) => entry.visualizationStyle),
        cacheKey
      },
      cache: {
        cacheKey,
        createdAt: Date.now(),
        sourceName: safeString(input.sourceName || input.filename || ''),
        sourceType
      },
      metadata: {
        intent: {
          learningIntent: intent.learningIntent,
          knowledgeDomain: intent.knowledgeDomain,
          subDomain: intent.subDomain,
          educationalStrategy: intent.educationalStrategy,
          reasoningStyle: intent.reasoningStyle,
          confidenceScore: intent.confidenceScore
        },
        supportsUnknownVisualizationTypes: true,
        strategyCount: candidates.strategies.length
      }
    });

    this.cache.set(cacheKey, profile);
    this.persistCache();
    return deepClone(profile);
  }

  serialize(profile = {}) {
    return JSON.stringify(normalizeVisualizationStrategyProfile(profile));
  }

  deserialize(serialized = '') {
    const parsed = parsePayload(serialized);
    if (!parsed) {
      this.warn('Failed to deserialize visualization strategy profile.');
      return normalizeVisualizationStrategyProfile({});
    }

    return migrateVisualizationStrategyProfile(parsed);
  }

  persistCache() {
    if (!this.persistenceAdapter) return false;

    const payload = {
      schemaVersion: STRATEGY_SCHEMA_VERSION,
      entries: [...this.cache.entries()],
      diagnostics: this.diagnostics,
      persistedAt: Date.now()
    };

    const serialized = JSON.stringify(payload);

    if (typeof this.persistenceAdapter.setItem === 'function') {
      this.persistenceAdapter.setItem(this.persistenceKey, serialized);
      return true;
    }

    if (typeof this.persistenceAdapter.save === 'function') {
      this.persistenceAdapter.save(this.persistenceKey, serialized);
      return true;
    }

    return false;
  }

  recoverCache() {
    if (!this.persistenceAdapter) return false;

    let raw = null;
    if (typeof this.persistenceAdapter.getItem === 'function') {
      raw = this.persistenceAdapter.getItem(this.persistenceKey);
    } else if (typeof this.persistenceAdapter.load === 'function') {
      raw = this.persistenceAdapter.load(this.persistenceKey);
    }

    if (!raw) return false;

    const parsed = parsePayload(raw);
    if (!parsed || !Array.isArray(parsed.entries)) {
      this.warn('Corrupted visualization strategy cache detected.');
      this.cache = new Map();
      this.diagnostics.recoveries += 1;
      return false;
    }

    this.cache = new Map(
      parsed.entries
        .filter((entry) => Array.isArray(entry) && entry.length === 2)
        .map(([key, value]) => [String(key), migrateVisualizationStrategyProfile(value)])
    );

    this.diagnostics.recoveries += 1;
    return true;
  }

  snapshot() {
    return {
      schemaVersion: STRATEGY_SCHEMA_VERSION,
      cacheSize: this.cache.size,
      persistenceKey: this.persistenceKey,
      diagnostics: deepClone(this.diagnostics)
    };
  }
}

export function createUniversalVisualizationStrategyEngine(options = {}) {
  return new UniversalVisualizationStrategyEngine(options);
}

const defaultEngine = createUniversalVisualizationStrategyEngine();

export function analyzeVisualizationStrategy(input = {}, options = {}) {
  if (options && options.engine && typeof options.engine.analyze === 'function') {
    return options.engine.analyze(input);
  }
  return defaultEngine.analyze(input);
}
