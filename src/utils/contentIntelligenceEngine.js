function normalizeText(value = '') {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

function titleCaseTerm(value = '') {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function inferTitle(text = '', subject = 'General Learning') {
  const normalized = normalizeText(text);
  if (!normalized) return `Untitled ${subject} Lesson`;
  const lower = normalized.toLowerCase();
  if (lower.includes('photosynthesis')) return 'Photosynthesis: Energy Conversion in Plants';
  if (lower.includes('algebra')) return 'Algebra: Foundations and Problem Solving';
  if (lower.includes('react')) return 'React: Building Interactive Interfaces';
  if (lower.includes('python')) return 'Python: Core Concepts and Practice';

  const firstSentence = normalized.split(/(?<=[.!?])\s+/)[0] || normalized;
  const compact = firstSentence
    .replace(/^[^a-z0-9]+/i, '')
    .replace(/[^a-z0-9\s]+/gi, ' ')
    .replace(/\b(the|a|an|this|that|is|are|and|of|to|for|with|from|into|using)\b/gi, ' ')
    .trim();

  return compact ? compact.slice(0, 70) : `${subject}: Core Concepts`;
}

function detectLanguage(text = '') {
  const normalized = normalizeText(text).toLowerCase();
  if (/\b(hindi|हिंदी|namaste|aap|tum)\b/.test(normalized)) return 'Hindi';
  if (/\b(telugu|తెలుగు|నేను|మీ)\b/.test(normalized)) return 'Telugu';
  if (/\b(chinese|中文|你|我们)\b/.test(normalized)) return 'Chinese';
  return 'English';
}

function detectSubject(text = '') {
  const normalized = normalizeText(text).toLowerCase();
  const rules = [
    ['Biology', /(cell|organism|anatomy|photosynthesis|gene|dna|plant|animal|biology)/],
    ['Chemistry', /(molecule|reaction|compound|acid|base|periodic|chemistry)/],
    ['Physics', /(force|motion|energy|velocity|acceleration|quantum|physics)/],
    ['Computer Science', /(algorithm|programming|code|function|class|database|network|computer)/],
    ['Mathematics', /(equation|integral|derivative|matrix|geometry|algebra|theorem)/],
    ['History', /(history|war|empire|civilization|timeline)/],
    ['Business', /(market|strategy|revenue|management|leadership|business)/],
    ['Medicine', /(surgery|patient|diagnosis|medical|clinical)/],
    ['Engineering', /(circuit|prototype|design|engineering|system)/]
  ];
  const match = rules.find(([, regex]) => regex.test(normalized));
  return match ? match[0] : 'General Learning';
}

function detectDifficulty(text = '') {
  const normalized = normalizeText(text).toLowerCase();
  const hardSignals = (normalized.match(/(advanced|complex|optimize|architecture|proof|derivation|trade-off)/g) || []).length;
  const easySignals = (normalized.match(/(intro|basic|simple|beginner|overview|foundation)/g) || []).length;
  if (hardSignals >= 3) return 'Expert';
  if (hardSignals >= 1) return 'Hard';
  if (easySignals >= 3) return 'Beginner';
  return 'Medium';
}

function extractKeywords(text = '') {
  const normalized = normalizeText(text);
  const matches = normalized.match(/\b[A-Za-z][A-Za-z']+\b/g) || [];
  const terms = matches
    .filter((item) => item.length > 3)
    .map((item) => titleCaseTerm(item));
  return Array.from(new Set(terms)).slice(0, 12);
}

function extractEntities(text = '') {
  const normalized = normalizeText(text);
  const tokens = normalized.split(/\s+/).filter(Boolean);
  const stopWords = new Set(['the', 'this', 'that', 'with', 'from', 'into', 'using', 'about', 'lesson', 'covers', 'cover', 'and', 'for', 'have', 'has', 'their', 'your', 'main', 'key']);
  const entities = tokens
    .filter((token) => token.length > 4 && !stopWords.has(token.toLowerCase()))
    .map((token) => titleCaseTerm(token));
  return Array.from(new Set(entities)).slice(0, 8);
}

function extractConceptTerms(text = '', keywords = []) {
  const normalized = normalizeText(text);
  const tokens = normalized.split(/\s+/).filter(Boolean);
  const stopWords = new Set(['the', 'this', 'that', 'with', 'from', 'into', 'using', 'about', 'lesson', 'covers', 'cover', 'and', 'for', 'have', 'has', 'their', 'your', 'main', 'key', 'process', 'plants', 'plant', 'cells', 'cell', 'light', 'reactions', 'cycle', 'this', 'into']);
  const conceptTerms = [
    ...keywords,
    ...tokens
      .filter((token) => token.length > 4 && !stopWords.has(token.toLowerCase()))
      .map((token) => titleCaseTerm(token))
  ];
  return Array.from(new Set(conceptTerms)).slice(0, 12);
}

function extractRelationships(text = '') {
  const normalized = normalizeText(text).toLowerCase();
  const relationships = [];
  if (/uses|involves|includes|contains/.test(normalized)) {
    relationships.push('uses/involves');
  }
  if (/causes|affects|depends on|requires/.test(normalized)) {
    relationships.push('causes/depends on');
  }
  if (/converts|transforms|connects/.test(normalized)) {
    relationships.push('converts/transforms');
  }
  return relationships.slice(0, 4);
}

export function buildContentIntelligenceProfile({ sourceText = '', sourceName = '', sourceType = 'text', visionSummary = '' } = {}) {
  const cleanedText = normalizeText(sourceText || visionSummary || '');
  const safeName = normalizeText(sourceName || 'Untitled content');
  const weakSignal = /i could not|uncertain|unknown|not confidently|not sure|could not confidently|cannot identify/i;
  const hasUsefulText = Boolean(cleanedText && cleanedText.length >= 20 && !weakSignal.test(cleanedText.toLowerCase()));
  const isWeakContent = !hasUsefulText || (sourceType === 'image' && !cleanedText && /screenshot|image|photo/i.test(safeName));

  const title = !isWeakContent
    ? inferTitle(cleanedText || safeName, detectSubject(cleanedText || visionSummary || safeName))
    : `Untitled ${detectSubject(cleanedText || visionSummary || safeName)} Lesson`;

  const subject = detectSubject(cleanedText || visionSummary || safeName);
  const difficulty = detectDifficulty(cleanedText || visionSummary || safeName);
  const language = detectLanguage(cleanedText || visionSummary || safeName);
  const keywords = extractKeywords(cleanedText || visionSummary || safeName);
  const entities = extractEntities(cleanedText || visionSummary || safeName);
  const relationships = extractRelationships(cleanedText || visionSummary || safeName);

  const topicTerms = [
    ...new Set([
      cleanedText ? cleanedText.split(/\s+/).slice(0, 6).join(' ') : '',
      subject,
      safeName.replace(/\.[^.]+$/, '')
    ].filter(Boolean))
  ];

  const chapters = [
    'Introduction',
    'Core Concepts',
    'Practical Application',
    'Review and Practice'
  ];

  const topics = [
    ...new Set([
      subject,
      ...keywords.slice(0, 5),
      cleanedText ? cleanedText.split(/\s+/).slice(0, 4).join(' ') : ''
    ].filter(Boolean))
  ].slice(0, 6);

  const subtopics = topics.slice(1, 4);

  const learningObjectives = [
    `Understand the main ideas in ${subject.toLowerCase()}`,
    `Identify the key concepts and relationships in the material`,
    `Apply the lesson content to practical scenarios`
  ];

  const keyConcepts = Array.from(new Set([
    subject,
    ...keywords.slice(0, 4),
    ...entities.filter((item) => item.toLowerCase() !== subject.toLowerCase()),
    ...extractConceptTerms(cleanedText, keywords)
  ])).slice(0, 10);

  const skills = [
    'Concept recognition',
    'Critical thinking',
    'Knowledge application',
    'Revision and recall'
  ];

  const followUpPrompt = isWeakContent
    ? "I couldn't fully understand this file. Can you tell me what this is?"
    : '';

  return {
    title,
    subject,
    chapters,
    topics,
    subtopics,
    difficulty,
    learningObjectives,
    keyConcepts,
    skills,
    entities,
    relationships,
    language,
    followUpPrompt,
    sourceType,
    sourceName: safeName,
    confidence: isWeakContent ? 'low' : 'high'
  };
}
