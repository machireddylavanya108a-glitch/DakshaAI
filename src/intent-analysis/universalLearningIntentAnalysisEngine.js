const STORE_KEY = '__daksha_universal_learning_intent_analysis_store__';

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function safeString(value) {
  return String(value || '').trim();
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

function tokenize(value = '') {
  return sanitizeText(value)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function bigrams(tokens = []) {
  const pairs = [];
  for (let index = 0; index < tokens.length - 1; index += 1) {
    pairs.push(`${tokens[index]} ${tokens[index + 1]}`);
  }
  return pairs;
}

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'to', 'for', 'of', 'in', 'on', 'at', 'by', 'with', 'from', 'into', 'about',
  'this', 'that', 'these', 'those', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'it', 'as', 'if',
  'can', 'could', 'will', 'would', 'should', 'may', 'might', 'we', 'you', 'they', 'he', 'she', 'them',
  'our', 'your', 'their', 'his', 'her', 'its', 'lesson', 'topic', 'content', 'file', 'document', 'image', 'video'
]);

const SOURCE_TYPE_ALIASES = {
  pdf: 'pdf',
  document: 'pdf',
  doc: 'docx',
  docx: 'docx',
  ppt: 'ppt',
  pptx: 'pptx',
  presentation: 'pptx',
  book: 'book',
  ebook: 'book',
  image: 'image',
  camera: 'camera-scan',
  scan: 'camera-scan',
  'camera-ocr': 'camera-scan',
  handwritten: 'handwritten-notes',
  notes: 'handwritten-notes',
  audio: 'audio',
  video: 'video',
  website: 'website',
  web: 'website',
  youtube: 'youtube',
  code: 'source-code',
  repository: 'source-code',
  'research-paper': 'research-paper',
  research: 'research-paper',
  text: 'text',
  txt: 'text'
};

const INTENT_VERBS = [
  'learn', 'understand', 'analyze', 'explain', 'compare', 'build', 'design', 'debug', 'implement', 'summarize',
  'practice', 'review', 'evaluate', 'reason', 'explore', 'interpret', 'synthesize', 'model', 'simulate', 'optimize'
];

export function normalizeIntentSourceType(sourceType = '') {
  const normalized = safeString(sourceType).toLowerCase().replace(/[_\s]+/g, '-');
  if (!normalized) return 'text';
  return SOURCE_TYPE_ALIASES[normalized] || normalized;
}

function detectLanguage(tokens = []) {
  const merged = tokens.join(' ');
  if (/\p{Script=Telugu}/u.test(merged)) return 'Telugu';
  if (/\p{Script=Devanagari}/u.test(merged)) return 'Hindi';
  if (/\p{Script=Han}/u.test(merged)) return 'Chinese';
  if (/\p{Script=Arabic}/u.test(merged)) return 'Arabic';
  return 'English';
}

function rankTerms(tokens = [], limit = 20) {
  const counts = new Map();
  tokens.forEach((token) => {
    if (token.length < 3 || STOP_WORDS.has(token)) return;
    counts.set(token, (counts.get(token) || 0) + 1);
  });

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([token, count]) => ({ token, count }));
}

function toTitleCase(value = '') {
  return safeString(value)
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function deriveKnowledgeDomain(tokens = [], ranked = []) {
  const top = ranked.slice(0, 6).map((item) => item.token);
  if (!top.length) return 'Open Knowledge Domain';

  const phrase = top.slice(0, 2).join(' ');
  return toTitleCase(phrase);
}

function deriveSubDomain(ranked = []) {
  const top = ranked.slice(0, 8).map((item) => item.token);
  if (!top.length) return 'General Subdomain';
  if (top.length === 1) return toTitleCase(top[0]);
  return toTitleCase(`${top[0]} ${top[1]}`);
}

function deriveLearningIntent(tokens = [], sourceType = 'text') {
  const detectedVerb = INTENT_VERBS.find((verb) => tokens.includes(verb));
  if (detectedVerb) {
    return `${toTitleCase(detectedVerb)} and apply conceptually`;
  }

  if (sourceType === 'source-code') return 'Inspect, reason, and implement logic';
  if (sourceType === 'research-paper') return 'Analyze evidence and synthesize findings';
  if (sourceType === 'handwritten-notes') return 'Consolidate and clarify handwritten knowledge';
  if (sourceType === 'youtube' || sourceType === 'video') return 'Observe, explain, and practice from audiovisual content';

  return 'Understand, reason, and apply extracted knowledge';
}

function deriveLearningObjective(domain = '', subDomain = '', intent = '') {
  return `Develop transferable understanding in ${domain || 'the domain'} by ${safeString(intent).toLowerCase()} across ${subDomain || 'key sub-areas'}.`;
}

function deriveComplexity(tokens = [], sourceType = 'text', signal = {}) {
  const tokenCount = tokens.length;
  const structuralSignals = toFiniteNumber(signal.headings, 0) + toFiniteNumber(signal.tables, 0) + toFiniteNumber(signal.codeBlocks, 0);
  const multimodalWeight = ['video', 'audio', 'youtube', 'pptx', 'image', 'camera-scan'].includes(sourceType) ? 2 : 1;
  const raw = tokenCount / 80 + structuralSignals * 0.5 + multimodalWeight;

  if (raw >= 9) return 'high';
  if (raw >= 4) return 'medium';
  return 'low';
}

function deriveAbstractionLevel(tokens = []) {
  const abstractSignals = tokens.filter((token) => /theory|principle|model|framework|strategy|architecture|pattern|abstraction|reasoning/.test(token)).length;
  const concreteSignals = tokens.filter((token) => /step|example|code|figure|image|diagram|implementation|output/.test(token)).length;

  if (abstractSignals > concreteSignals + 2) return 'high-abstraction';
  if (concreteSignals > abstractSignals + 2) return 'concrete';
  return 'mixed';
}

function deriveEducationalStrategy(sourceType = 'text', complexity = 'medium', abstraction = 'mixed') {
  if (sourceType === 'source-code') return 'code-first-scaffolded-reasoning';
  if (sourceType === 'research-paper') return 'evidence-led-critical-reading';
  if (sourceType === 'youtube' || sourceType === 'video') return 'segment-and-reflect';
  if (sourceType === 'camera-scan' || sourceType === 'handwritten-notes') return 'clarify-and-structure';
  if (complexity === 'high' && abstraction === 'high-abstraction') return 'concept-to-application-spiral';
  return 'guided-conceptual-practice';
}

function deriveReasoningStyle(tokens = []) {
  const analytical = tokens.filter((token) => /why|because|therefore|analyze|evaluate|assess|tradeoff/.test(token)).length;
  const procedural = tokens.filter((token) => /how|step|procedure|workflow|implement|build/.test(token)).length;
  const comparative = tokens.filter((token) => /compare|contrast|versus|difference/.test(token)).length;

  if (comparative > analytical && comparative > procedural) return 'comparative';
  if (analytical > procedural) return 'analytical';
  if (procedural > 0) return 'procedural';
  return 'conceptual';
}

function deriveLearningPathway(intent = '', strategy = '', reasoning = '', ranked = []) {
  const anchors = ranked.slice(0, 4).map((item) => toTitleCase(item.token));
  return [
    `Intent alignment: ${intent}`,
    `Strategy: ${strategy}`,
    `Reasoning mode: ${reasoning}`,
    `Core anchors: ${anchors.join(', ') || 'General anchors'}`,
    'Practice and feedback loop',
    'Checkpoint-based consolidation'
  ];
}

function deriveSignalSummary(text = '') {
  const lines = sanitizeText(text).split(/\n+/).map((line) => line.trim()).filter(Boolean);
  return {
    headings: lines.filter((line) => /^(#|chapter|section|unit|topic|part)\b/i.test(line)).length,
    tables: (text.match(/\|[^\n]+\|/g) || []).length,
    codeBlocks: (text.match(/(```[\s\S]*?```|\b(function|class|const|let|var|def|interface|import)\b)/g) || []).length,
    figures: (text.match(/\b(figure|diagram|chart|graph|plot|image|table)\b/gi) || []).length,
    formulas: (text.match(/\b(=|integral|derivative|sigma|lambda|theorem|proof)\b/gi) || []).length
  };
}

function buildCacheKey(input = {}) {
  const sourceType = normalizeIntentSourceType(input.sourceType || input.type || 'text');
  const content = sanitizeText(input.content || input.text || input.rawExtractedContent || input.extractedText || '');
  const sourceName = sanitizeText(input.sourceName || input.filename || '');
  const visual = sanitizeText(input.visualDescription || '');
  const compact = JSON.stringify({ sourceType, sourceName, content: content.slice(0, 2500), visual: visual.slice(0, 1200) });

  let hash = 0;
  for (let index = 0; index < compact.length; index += 1) {
    hash = ((hash << 5) - hash + compact.charCodeAt(index)) | 0;
  }

  return `intent-${Math.abs(hash)}`;
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

export function normalizeIntentOutput(output = {}) {
  const source = isObject(output) ? output : {};
  return {
    schemaVersion: 'v1',
    learningIntent: safeString(source.learningIntent) || 'Understand, reason, and apply extracted knowledge',
    knowledgeDomain: safeString(source.knowledgeDomain) || 'Open Knowledge Domain',
    subDomain: safeString(source.subDomain) || 'General Subdomain',
    learningObjective: safeString(source.learningObjective) || 'Develop foundational understanding through adaptive reasoning.',
    visualizationComplexity: ['low', 'medium', 'high'].includes(source.visualizationComplexity) ? source.visualizationComplexity : 'medium',
    interactionComplexity: ['low', 'medium', 'high'].includes(source.interactionComplexity) ? source.interactionComplexity : 'medium',
    abstractionLevel: safeString(source.abstractionLevel) || 'mixed',
    educationalStrategy: safeString(source.educationalStrategy) || 'guided-conceptual-practice',
    reasoningStyle: safeString(source.reasoningStyle) || 'conceptual',
    learningPathway: asArray(source.learningPathway).map((item) => safeString(item)).filter(Boolean),
    confidenceScore: clamp(source.confidenceScore, 0, 1),
    sourceType: normalizeIntentSourceType(source.sourceType || 'text'),
    language: safeString(source.language) || 'English',
    tags: asArray(source.tags).map((tag) => safeString(tag)).filter(Boolean),
    diagnostics: isObject(source.diagnostics) ? source.diagnostics : {},
    metadata: isObject(source.metadata) ? source.metadata : {}
  };
}

export class UniversalLearningIntentAnalysisEngine {
  constructor(options = {}) {
    this.options = isObject(options) ? options : {};
    this.persistenceAdapter = this.options.persistenceAdapter || createDefaultPersistenceAdapter();
    this.persistenceKey = safeString(this.options.persistenceKey) || 'daksha.universal.learning.intent.cache.v1';
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

  warn(message = 'unknown warning') {
    this.diagnostics.warnings.push(safeString(message));
    if (this.diagnostics.warnings.length > 200) {
      this.diagnostics.warnings.shift();
    }
  }

  analyze(input = {}) {
    this.diagnostics.analyses += 1;
    const sourceType = normalizeIntentSourceType(input.sourceType || input.type || this.options.defaultSourceType || 'text');
    const sourceName = safeString(input.sourceName || input.filename || '');
    const content = sanitizeText(input.content || input.text || input.rawExtractedContent || input.extractedText || '');
    const visualDescription = sanitizeText(input.visualDescription || input.visionSummary || '');
    const transcript = sanitizeText(input.transcript || '');
    const merged = [content, visualDescription, transcript].filter(Boolean).join(' ');

    const cacheKey = buildCacheKey({ sourceType, sourceName, content: merged, visualDescription });
    if (this.cache.has(cacheKey)) {
      this.diagnostics.cacheHits += 1;
      return deepClone(this.cache.get(cacheKey));
    }

    this.diagnostics.cacheMisses += 1;

    const tokens = tokenize(merged || sourceName);
    const ranked = rankTerms(tokens, 24);
    const signal = deriveSignalSummary(merged);

    const knowledgeDomain = deriveKnowledgeDomain(tokens, ranked);
    const subDomain = deriveSubDomain(ranked);
    const learningIntent = deriveLearningIntent(tokens, sourceType);
    const learningObjective = deriveLearningObjective(knowledgeDomain, subDomain, learningIntent);

    const visualizationComplexity = deriveComplexity(tokens, sourceType, signal);
    const interactionComplexity = deriveComplexity(tokens, sourceType, {
      headings: signal.headings,
      tables: signal.figures,
      codeBlocks: signal.codeBlocks
    });

    const abstractionLevel = deriveAbstractionLevel(tokens);
    const educationalStrategy = deriveEducationalStrategy(sourceType, visualizationComplexity, abstractionLevel);
    const reasoningStyle = deriveReasoningStyle(tokens);
    const learningPathway = deriveLearningPathway(learningIntent, educationalStrategy, reasoningStyle, ranked);

    const evidenceScore = clamp((tokens.length / 120) + (ranked.length / 30) + (signal.headings / 10), 0, 1);
    const confidenceScore = clamp((evidenceScore * 0.72) + (merged.length > 40 ? 0.2 : 0.08), 0, 1);

    const output = normalizeIntentOutput({
      learningIntent,
      knowledgeDomain,
      subDomain,
      learningObjective,
      visualizationComplexity,
      interactionComplexity,
      abstractionLevel,
      educationalStrategy,
      reasoningStyle,
      learningPathway,
      confidenceScore,
      sourceType,
      language: detectLanguage(tokens),
      tags: ranked.slice(0, 10).map((item) => toTitleCase(item.token)),
      diagnostics: {
        tokenCount: tokens.length,
        rankedTerms: ranked,
        signal,
        cacheKey,
        sourceName,
        contentLength: merged.length
      },
      metadata: {
        contentType: sourceType,
        unknownFutureTypeHandled: !Object.values(SOURCE_TYPE_ALIASES).includes(sourceType)
      }
    });

    this.cache.set(cacheKey, output);
    this.persistCache();
    return deepClone(output);
  }

  serializeIntent(intent = {}) {
    return JSON.stringify(normalizeIntentOutput(intent));
  }

  deserializeIntent(serialized = '') {
    const parsed = parsePayload(serialized);
    if (!parsed) {
      this.warn('Failed to deserialize intent payload.');
      return normalizeIntentOutput({});
    }
    return normalizeIntentOutput(parsed);
  }

  persistCache() {
    if (!this.persistenceAdapter) return false;

    const payload = {
      schemaVersion: 'v1',
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
      this.warn('Intent cache payload corrupted. Reinitializing cache.');
      this.cache = new Map();
      this.diagnostics.recoveries += 1;
      return false;
    }

    this.cache = new Map(
      parsed.entries
        .filter((entry) => Array.isArray(entry) && entry.length === 2)
        .map(([key, value]) => [String(key), normalizeIntentOutput(value)])
    );

    this.diagnostics.recoveries += 1;
    return true;
  }

  snapshot() {
    return {
      diagnostics: deepClone(this.diagnostics),
      cacheSize: this.cache.size,
      persistenceKey: this.persistenceKey
    };
  }
}

export function createUniversalLearningIntentAnalysisEngine(options = {}) {
  return new UniversalLearningIntentAnalysisEngine(options);
}

const defaultEngine = createUniversalLearningIntentAnalysisEngine();

export function analyzeUniversalLearningIntent(input = {}, options = {}) {
  if (options && options.engine && typeof options.engine.analyze === 'function') {
    return options.engine.analyze(input);
  }
  return defaultEngine.analyze(input);
}
