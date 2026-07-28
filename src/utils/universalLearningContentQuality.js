function safeString(value) {
  return String(value || '').trim();
}

function toWords(value = '') {
  return safeString(value)
    .replace(/-/g, ' ')
    .replace(/[^A-Za-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);
}

function cleanSentence(value = '') {
  return safeString(value)
    .replace(/\s+/g, ' ')
    .replace(/\b(the visible portion|this image shows|uploaded image|screenshot|i can see|the document contains)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanFilename(sourceName = '') {
  return safeString(sourceName)
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isLikelyBase64(value = '') {
  const text = safeString(value);
  return /data:[^;]+;base64,|[A-Za-z0-9+/]{100,}={0,2}/.test(text);
}

function stripBase64(value = '') {
  const text = safeString(value);
  return text
    .replace(/data:[^;]+;base64,[A-Za-z0-9+/=\s]+/gi, '')
    .replace(/\b[A-Za-z0-9+/]{120,}={0,2}\b/g, '')
    .trim();
}

function extractConcepts(value = '') {
  const text = safeString(value);
  const normalized = text.toLowerCase();
  const seedConcepts = [
    ['Digital learning environments', /digital learning|online learning|learning platform|virtual classroom|smart classroom/],
    ['AI in education', /ai|artificial intelligence|intelligent tutor|adaptive learning/],
    ['Data visualization', /data visualization|analytics|charts|graphs|dashboard/],
    ['Interdisciplinary learning', /interdisciplinary|cross-disciplinary|integrated learning/],
    ['Bioinformatics', /bioinformatics|genomics|biomedical data|anatomy data/],
    ['Digital twins', /digital twin|simulation model|virtual model/],
    ['Programming', /code|coding|programming|software/],
    ['Anatomy', /anatomy|physiology|human body/],
    ['Machine learning', /machine learning|model training|neural network/],
    ['Educational technology', /edtech|education technology|technology-enhanced learning/]
  ];

  const concepts = seedConcepts
    .filter(([, regex]) => regex.test(normalized))
    .map(([label]) => label);

  if (concepts.length) {
    return concepts;
  }

  const words = toWords(text)
    .filter((word) => word.length > 4)
    .filter((word) => !/^(image|visual|shows|screen|learning|lesson|topic|content|uploaded|portion|depicts)$/i.test(word));

  return Array.from(new Set(words.map((word) => `${word[0].toUpperCase()}${word.slice(1).toLowerCase()}`))).slice(0, 8);
}

function inferSubjectFromConcepts(concepts = [], fallbackText = '') {
  const joined = `${concepts.join(' ')} ${fallbackText}`.toLowerCase();
  if (/education|learning|classroom|edtech/.test(joined)) return 'Education Technology';
  if (/biology|anatomy|bioinformatics|genomics|medical/.test(joined)) return 'Biology';
  if (/programming|software|algorithm|code|react|python/.test(joined)) return 'Computer Science';
  if (/physics|chemistry|mathematics/.test(joined)) return 'STEM';
  return 'General Learning';
}

function inferLanguage(rawExtractedContent = '', detectedText = '') {
  const probe = `${rawExtractedContent} ${detectedText}`;
  if (!safeString(probe)) return 'Unknown';
  if (/[\u0C00-\u0C7F]/.test(probe)) return 'Telugu';
  if (/[\u0900-\u097F]/.test(probe)) return 'Hindi';
  if (/[\u4E00-\u9FFF]/.test(probe)) return 'Chinese';
  return 'English';
}

function isDecorativeImage(text = '', concepts = []) {
  const normalized = text.toLowerCase();
  const decorativeSignals = /wallpaper|aesthetic|background|landscape|portrait|logo only|icon only/;
  return decorativeSignals.test(normalized) || (decorativeSignals.test(normalized) && concepts.length < 2);
}

function isInterfaceScreenshot(text = '') {
  return /ui|interface|dashboard|button|menu|toolbar|settings|screenshot/.test(text.toLowerCase());
}

function classifyInputPurpose(content = {}) {
  const sourceType = safeString(content.sourceType).toLowerCase();
  const combined = `${safeString(content.rawExtractedContent)} ${safeString(content.visualDescription)} ${safeString(content.detectedText)}`;
  const concepts = Array.isArray(content.detectedConcepts) ? content.detectedConcepts : [];
  const normalized = combined.toLowerCase();

  if (sourceType === 'image') {
    if (isDecorativeImage(combined, concepts)) return 'decorative image';
    if (concepts.length >= 3) return 'educational material';
    if (isInterfaceScreenshot(combined)) return 'interface screenshot';
    if (/chart|graph|axis|plot/.test(normalized)) return 'chart';
    if (/diagram|flow|architecture|process/.test(normalized)) return 'diagram';
    if (/code|function|class|import|const /.test(normalized)) return 'code screenshot';
    if (/chapter|section|paragraph|page|document/.test(normalized)) return 'document screenshot';
    return 'mixed media';
  }

  if (sourceType === 'pdf' || sourceType === 'docx') return 'textbook page';
  if (sourceType === 'ppt' || sourceType === 'pptx') return 'infographic';
  if (sourceType === 'camera-ocr') return 'notes';
  return 'educational material';
}

function pickPrimaryConcept(concepts = [], fallback = 'General Learning') {
  if (!Array.isArray(concepts) || concepts.length === 0) return fallback;
  const ranked = [
    'Technology-Enhanced Learning',
    'Educational technology',
    'AI in education',
    'Digital learning environments'
  ];
  const found = ranked.find((item) => concepts.some((concept) => concept.toLowerCase() === item.toLowerCase()));
  return found || concepts[0];
}

function sanitizeTitleCandidate(value = '') {
  return cleanSentence(value)
    .replace(/^the\s+/i, '')
    .replace(/^this\s+/i, '')
    .replace(/^uploaded\s+/i, '')
    .replace(/^screenshot\s+/i, '')
    .replace(/^image\s+/i, '')
    .replace(/^document\s+/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isBannedTitleStart(title = '') {
  return /^(the visible portion|this image shows|screenshot|uploaded image|i can see|the document contains)/i.test(title);
}

function isLikelyDescriptiveFilename(name = '') {
  const cleaned = cleanFilename(name);
  if (!cleaned) return false;
  if (/^(screenshot|image|photo|scan|upload|file|document)(\s|\(|-|_)?/i.test(cleaned)) return false;
  const words = toWords(cleaned);
  return words.length >= 2 && words.length <= 8;
}

function buildTitleFromConcepts(concepts = [], subject = 'General Learning') {
  const conceptText = concepts.join(' ').toLowerCase();
  if (/education|learning/.test(conceptText) && /(ai|digital|analytics|visualization|bioinformatics)/.test(conceptText)) {
    return 'Technology-Enhanced Learning';
  }
  if (/ai in education/.test(conceptText)) return 'AI-Powered Learning Environments';
  if (/digital learning environments/.test(conceptText)) return 'Future of Digital Education';
  if (concepts.length > 0) return concepts[0];
  return '';
}

export function resolveLearningTopic(content = {}) {
  const filename = cleanFilename(content.sourceName || content.filename || '');
  const concepts = Array.isArray(content.detectedConcepts) ? content.detectedConcepts : [];
  const subject = safeString(content.subject) || inferSubjectFromConcepts(concepts, content.rawExtractedContent);

  const candidates = [];
  const conceptTitle = buildTitleFromConcepts(concepts, subject);
  if (conceptTitle) candidates.push({ value: conceptTitle, sourceBasis: 'concepts', confidence: 0.86 });

  if (isLikelyDescriptiveFilename(filename)) {
    candidates.push({ value: filename, sourceBasis: 'filename', confidence: 0.52 });
  }

  const textSample = cleanSentence(content.rawExtractedContent || content.visualDescription || '')
    .split(/[.!?\n]/)
    .map((segment) => sanitizeTitleCandidate(segment))
    .find((segment) => toWords(segment).length >= 3 && toWords(segment).length <= 8);

  if (textSample) {
    candidates.push({ value: textSample, sourceBasis: 'text-sample', confidence: 0.42 });
  }

  const selected = candidates
    .map((candidate) => ({ ...candidate, value: sanitizeTitleCandidate(candidate.value).slice(0, 80) }))
    .find((candidate) => {
      const words = toWords(candidate.value);
      if (words.length < 3 || words.length > 8) return false;
      if (isBannedTitleStart(candidate.value)) return false;
      if (/\.(png|jpg|jpeg|webp|gif|pdf|docx|pptx?)$/i.test(candidate.value)) return false;
      if (/^image\/?(png|jpg|jpeg|webp|gif)$/i.test(candidate.value)) return false;
      if (/^visible portion/i.test(candidate.value)) return false;
      return true;
    }) || {
      value: 'Topic not detected yet',
      sourceBasis: 'fallback',
      confidence: 0.2
    };

  const subtopics = Array.from(new Set(concepts)).filter(Boolean).slice(0, 6);

  return {
    title: selected.value,
    subject,
    primaryTopic: pickPrimaryConcept(concepts, selected.value),
    subtopics,
    confidence: selected.confidence,
    sourceBasis: selected.sourceBasis
  };
}

function collectDetectedText(rawExtractedContent = '') {
  const text = stripBase64(rawExtractedContent);
  const lines = text.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const likelyOcr = lines.filter((line) => {
    if (line.length < 3 || line.length > 120) return false;
    if (/^[a-z\s]+$/i.test(line) && line.split(' ').length < 3) return false;
    return true;
  });
  return likelyOcr.join('\n');
}

function deriveDifficultyScore(content = {}) {
  const text = `${safeString(content.detectedText)} ${safeString(content.rawExtractedContent)} ${safeString(content.visualDescription)}`;
  const concepts = Array.isArray(content.detectedConcepts) ? content.detectedConcepts : [];
  const normalized = text.toLowerCase();
  const sourceType = safeString(content.sourceType).toLowerCase();
  const classification = safeString(content.classification).toLowerCase();

  const vocabularyComplexity = (normalized.match(/bioinformatics|interdisciplinary|optimization|architecture|analytics|computational/g) || []).length * 9;
  const conceptDepth = concepts.length * 6;
  const prerequisiteKnowledge = /algorithm|genomics|calculus|systems/.test(normalized) ? 16 : 6;
  const technicalDensity = (normalized.match(/\b(api|model|code|dataset|analysis|pipeline|simulation)\b/g) || []).length * 5;
  const score = Math.max(1, Math.min(100, vocabularyComplexity + conceptDepth + prerequisiteKnowledge + technicalDensity));

  let level = 'Beginner';
  if (score >= 65) level = 'Advanced';
  else if (score >= 36) level = 'Intermediate';

  const strongTechnicalSignal = /proof|derivation|compiler|distributed systems|genomics pipeline|numerical optimization/.test(normalized);
  if (sourceType === 'image' && !strongTechnicalSignal && !/code screenshot|document screenshot/.test(classification) && level === 'Advanced') {
    level = 'Intermediate';
  }

  return {
    level,
    score,
    reason: `Scored from vocabulary complexity (${vocabularyComplexity}), concept depth (${conceptDepth}), prerequisites (${prerequisiteKnowledge}), and technical density (${technicalDensity}).`
  };
}

function inferEducationalValue(classification = '', conceptCount = 0) {
  if (classification === 'decorative image') return 'low';
  if (conceptCount >= 4) return 'high';
  if (conceptCount >= 2) return 'medium';
  return 'low';
}

export function normalizeVisionOutput({
  sourceType = 'text',
  sourceName = '',
  rawExtractedContent = '',
  visualDescription = '',
  detectedText = ''
} = {}) {
  const safeRaw = stripBase64(rawExtractedContent);
  const safeVisual = stripBase64(visualDescription || rawExtractedContent);
  const ocrText = stripBase64(detectedText || collectDetectedText(safeRaw));
  const detectedConcepts = extractConcepts(`${safeVisual}\n${ocrText}`);
  const subject = inferSubjectFromConcepts(detectedConcepts, `${safeVisual} ${ocrText} ${sourceName}`);
  const topicResolution = resolveLearningTopic({
    sourceName,
    sourceType,
    rawExtractedContent: safeRaw,
    visualDescription: safeVisual,
    detectedText: ocrText,
    detectedConcepts,
    subject
  });
  const classification = classifyInputPurpose({
    sourceType,
    rawExtractedContent: safeRaw,
    visualDescription: safeVisual,
    detectedText: ocrText,
    detectedConcepts
  });
  const difficulty = deriveDifficultyScore({
    rawExtractedContent: safeRaw,
    visualDescription: safeVisual,
    detectedText: ocrText,
    detectedConcepts,
    sourceType,
    classification
  });

  return {
    sourceType,
    sourceName,
    rawExtractedContent: safeRaw,
    visualDescription: safeVisual,
    detectedText: ocrText,
    detectedObjects: [],
    detectedConcepts,
    subject,
    topic: topicResolution.title,
    subtopics: topicResolution.subtopics,
    contentPurpose: classification,
    confidence: topicResolution.confidence,
    language: inferLanguage(safeRaw, ocrText),
    difficulty,
    educationalValue: inferEducationalValue(classification, detectedConcepts.length),
    topicResolution,
    classification
  };
}

function countHeadingLines(text = '') {
  const lines = safeString(text).split(/\n+/).map((line) => line.trim()).filter(Boolean);
  return lines.filter((line) => /^(#|chapter|section|unit|topic)\b/i.test(line)).length;
}

function countChapters(text = '') {
  const lines = safeString(text).split(/\n+/).map((line) => line.trim()).filter(Boolean);
  return lines.filter((line) => /^(chapter\s+\d+|unit\s+\d+)/i.test(line)).length;
}

function countTables(text = '') {
  return (safeString(text).match(/\|[^\n]+\|/g) || []).length;
}

function countDiagrams(text = '', visualDescription = '') {
  const joined = `${text}\n${visualDescription}`;
  return (joined.match(/\b(diagram|flowchart|process map|architecture diagram|schematic|graph)\b/gi) || []).length;
}

function deterministicCount(count, confidentlyDetected, fallbackStatus = 'detected') {
  if (confidentlyDetected) {
    return {
      count,
      status: fallbackStatus
    };
  }

  return {
    count: null,
    status: 'not confidently detected'
  };
}

export function deriveDeterministicCounts(content = {}) {
  const sourceType = safeString(content.sourceType).toLowerCase();
  const ocrText = safeString(content.detectedText);
  const raw = safeString(content.rawExtractedContent);
  const visualDescription = safeString(content.visualDescription);
  const corpus = `${ocrText}\n${raw}`.trim();

  const headingCount = countHeadingLines(ocrText);
  const chapterCount = countChapters(ocrText);
  const tableCount = countTables(corpus);
  const diagramCount = countDiagrams(corpus, visualDescription);

  return {
    headings: headingCount > 0 ? deterministicCount(headingCount, true) : deterministicCount(0, false),
    chapters: chapterCount > 0 ? deterministicCount(chapterCount, true) : { count: 0, status: 'no clear chapter divisions' },
    tables: tableCount > 0 ? deterministicCount(tableCount, true) : deterministicCount(0, true, 'none detected'),
    images: sourceType === 'image' || sourceType === 'camera-ocr'
      ? deterministicCount(1, true)
      : deterministicCount((corpus.match(/\b(image|figure|photo)\b/gi) || []).length, true),
    diagrams: diagramCount > 0 ? deterministicCount(diagramCount, true) : deterministicCount(0, false)
  };
}

export function estimateLearningPlanSize({
  sourceType = 'text',
  classification = 'educational material',
  conceptCount = 0,
  difficulty = { score: 25 },
  textLength = 0
} = {}) {
  const difficultWeight = Math.max(0, Number(difficulty?.score || 0) - 20);

  let estimatedMinutes = 30;
  if (sourceType === 'image' || sourceType === 'camera-ocr') {
    estimatedMinutes = classification === 'decorative image' || classification === 'interface screenshot' ? 20 : 30;
    estimatedMinutes += Math.min(15, conceptCount * 3);
  } else {
    estimatedMinutes = Math.max(45, Math.round(textLength / 85));
    estimatedMinutes += Math.min(120, conceptCount * 6 + difficultWeight * 0.5);
  }

  if (classification === 'decorative image') {
    estimatedMinutes = Math.min(25, estimatedMinutes);
  }

  const hours = estimatedMinutes / 60;
  let size = 'micro';
  if (hours >= 30) size = 'long';
  else if (hours >= 5) size = 'course';
  else if (hours >= 1) size = 'short';

  return {
    estimatedMinutes,
    estimatedHours: Number(hours.toFixed(2)),
    lessons: size === 'micro' ? 1 : Math.min(8, Math.max(1, Math.ceil(conceptCount / 2))),
    size,
    showWeekly: size === 'course' || size === 'long',
    showMonthly: size === 'long',
    display: estimatedMinutes < 60 ? `${estimatedMinutes} minutes` : `${Math.round(hours)} hours`
  };
}

function sentenceSummary(topic = '', subject = '', concepts = []) {
  const conceptText = concepts.slice(0, 5).join(', ');
  return `Explore ${topic} through ${subject.toLowerCase()} concepts such as ${conceptText}.`;
}

function buildQuizFromConcepts(topic = '', concepts = []) {
  const pool = concepts.length ? concepts : [topic];
  return pool.slice(0, 5).map((concept, index) => ({
    question: `Which statement best explains ${concept}?`,
    options: [
      `${concept} as a core idea in ${topic}`,
      `${concept} as an unrelated concept`,
      `${concept} as only historical context`,
      `${concept} as a non-educational term`
    ],
    answer: `${concept} as a core idea in ${topic}`,
    id: `quiz-${index + 1}`
  }));
}

function buildFlashcardsFromConcepts(concepts = [], topic = '') {
  const pool = concepts.length ? concepts : [topic];
  const cards = [];
  for (let index = 0; index < Math.max(8, Math.min(12, pool.length * 2)); index += 1) {
    const concept = pool[index % pool.length];
    cards.push({
      front: concept,
      back: `${concept} is a key part of ${topic}.`
    });
  }
  return cards;
}

function buildMindMap(topic = '', concepts = []) {
  const nodes = [{ id: 'topic', label: topic, type: 'central' }];
  const edges = [];

  concepts.slice(0, 8).forEach((concept, index) => {
    const id = `node-${index + 1}`;
    nodes.push({ id, label: concept, type: 'concept' });
    edges.push({ source: 'topic', target: id, relation: 'includes' });
  });

  return {
    centralTopic: topic,
    nodes,
    edges
  };
}

export function buildIndependentLearningAssets({
  topicResolution,
  normalizedContent,
  deterministicCounts,
  planSize
} = {}) {
  const topic = safeString(topicResolution?.title) || 'Topic not detected yet';
  const subject = safeString(topicResolution?.subject) || 'General Learning';
  const concepts = Array.isArray(normalizedContent?.detectedConcepts) ? normalizedContent.detectedConcepts.slice(0, 8) : [];
  const subtopics = Array.isArray(topicResolution?.subtopics) && topicResolution.subtopics.length
    ? topicResolution.subtopics
    : concepts.slice(0, 5);

  const overview = `The source represents ${normalizedContent?.classification || 'educational material'} focused on ${topic}.`;

  const summary = `${topic} sits within ${subject.toLowerCase()} and highlights ${subtopics.slice(0, 5).join(', ')}. `
    + `The content connects visual context with practical learning ideas so learners can understand relationships between tools, concepts, and outcomes. `
    + `Use this as a short structured lesson and expand to deeper study only when additional source material is available.`;

  const roadmap = subtopics.length
    ? subtopics.map((item, index) => `${index + 1}. ${item}`)
    : [
      '1. Understand the central concept',
      '2. Identify supporting concepts',
      '3. Practice one application',
      '4. Reflect and summarize'
    ];

  const keywords = Array.from(new Set([topic, subject, ...concepts])).slice(0, 12);
  const cheatSheet = [
    ...subtopics.slice(0, 5).map((item) => `${item}: key concept connected to ${topic}.`),
    `Relationship: ${topic} combines multiple concepts into one learning system.`,
    `Takeaway: Focus on meaning first, then practice with examples.`
  ];

  const revisionNotes = [
    `Recall the central topic: ${topic}.`,
    `List 3 supporting concepts: ${subtopics.slice(0, 3).join(', ')}.`,
    'Explain one practical example in your own words.',
    'Identify what you still need to explore.'
  ];

  const realWorldExamples = [
    `Education: Apply ${topic} in an interactive classroom workflow.`,
    `Healthcare: Use data-rich visuals to explain difficult concepts to learners.`,
    `Software: Build guided modules that combine explanation, quiz, and reflection.`,
    `Research: Connect interdisciplinary signals into a single learning narrative.`
  ];

  const careerApplicable = normalizedContent?.classification === 'educational material' && concepts.length >= 4;

  return {
    title: topic,
    subject,
    overview,
    summary: summary.length < 100 ? `${summary} ${sentenceSummary(topic, subject, concepts)}` : summary,
    topics: subtopics,
    keywords,
    quiz: buildQuizFromConcepts(topic, subtopics),
    flashcards: buildFlashcardsFromConcepts(subtopics, topic),
    cheatSheet,
    mindMap: buildMindMap(topic, subtopics),
    revisionNotes,
    realWorldExamples,
    interviewQuestions: careerApplicable
      ? [
        `How would you apply ${topic} to a real-world project?`,
        `Which trade-offs matter most when scaling ${topic}?`,
        `How do you evaluate success when using ${topic}?`
      ]
      : [],
    practiceQuestions: [
      `Explain ${topic} to a beginner in 3-4 lines.`,
      `Choose one subtopic and describe a practical use case.`,
      'Create a short reflection with one insight and one question.'
    ],
    roadmap,
    deterministicCounts,
    careerLayer: careerApplicable
      ? { status: 'optional', confidence: 0.72 }
      : { status: 'not_applicable', confidence: 0.28 },
    planSize
  };
}

function toComparableText(value) {
  if (Array.isArray(value)) return value.map((item) => toComparableText(item)).join(' ');
  if (value && typeof value === 'object') return toComparableText(Object.values(value));
  return safeString(value).toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function jaccardSimilarity(a = '', b = '') {
  const setA = new Set(toComparableText(a).split(' ').filter(Boolean));
  const setB = new Set(toComparableText(b).split(' ').filter(Boolean));
  if (setA.size === 0 || setB.size === 0) return 0;

  const intersection = [...setA].filter((word) => setB.has(word)).length;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

function hasGenericRoadmapItem(item = '') {
  return /(current level review|learning style drill|career goal application|language recap)/i.test(item);
}

export function validateLearningOutput({
  topicResolution,
  assets,
  normalizedContent,
  deterministicCounts,
  planSize,
  flowType = 'content-first'
} = {}) {
  const issues = [];
  const title = safeString(topicResolution?.title);

  if (!title || title === 'Topic not detected yet') issues.push('Topic was not reliably resolved.');
  if (title.length > 80) issues.push('Topic exceeds 80 characters.');
  if (title.split(' ').length > 12) issues.push('Topic looks like a sentence.');
  if (/\.(png|jpg|jpeg|gif|webp|pdf|docx|pptx?)$/i.test(title)) issues.push('Topic contains filename text.');
  if (isBannedTitleStart(title)) issues.push('Topic starts with banned filler language.');

  const roadmap = Array.isArray(assets?.roadmap) ? assets.roadmap : [];
  if (roadmap.some((item) => hasGenericRoadmapItem(item))) issues.push('Roadmap contains generic placeholders.');

  const similarityChecks = [
    ['overview', assets?.overview, assets?.summary],
    ['summary', assets?.summary, assets?.cheatSheet],
    ['cheatSheet', assets?.cheatSheet, assets?.revisionNotes],
    ['mindMap', assets?.mindMap, assets?.summary]
  ];

  const duplicateSections = similarityChecks.filter(([, a, b]) => jaccardSimilarity(a, b) > 0.7);
  if (duplicateSections.length > 0) {
    issues.push('Sections are near-duplicates and require regeneration.');
  }

  if (planSize?.size === 'micro' && (planSize?.showWeekly || planSize?.showMonthly)) {
    issues.push('Micro lessons cannot show weekly or monthly goals.');
  }

  if ((assets?.careerLayer?.status || '') !== 'not_applicable' && (assets?.careerLayer?.confidence || 0) < 0.7) {
    issues.push('Career roles cannot be shown with low confidence.');
  }

  if (flowType === 'content-first' && /interview completed/i.test(JSON.stringify(assets || {}))) {
    issues.push('Content-first output incorrectly claims interview completion.');
  }

  if (isLikelyBase64(JSON.stringify(assets || {})) || isLikelyBase64(normalizedContent?.rawExtractedContent || '')) {
    issues.push('Raw base64 leaked into visible output.');
  }

  const countKeys = ['headings', 'chapters', 'tables', 'images', 'diagrams'];
  countKeys.forEach((key) => {
    const entry = deterministicCounts?.[key];
    if (!entry || typeof entry !== 'object' || !('status' in entry)) {
      issues.push(`Deterministic count missing for ${key}.`);
    }
  });

  return {
    isValid: issues.length === 0,
    issues
  };
}

export function buildReliabilityFallbackMessage() {
  return 'We understood the source, but some learning assets could not be generated reliably.';
}
