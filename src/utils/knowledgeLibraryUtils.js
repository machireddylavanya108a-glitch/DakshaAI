const SEARCHABLE_FIELDS = [
  'title',
  'summary',
  'topics',
  'keywords',
  'content',
  'sourceType',
  'tags'
];

const UNKNOWN_TOPIC_PATTERN = /^(screenshot|image|file|document|upload|camera|scan|photo)(\s|\(|-|_)?/i;

function normalizeText(value) {
  return String(value || '').trim();
}

function normalizeArray(value) {
  if (Array.isArray(value)) return value.map((item) => normalizeText(item)).filter(Boolean);
  if (!value) return [];
  return [normalizeText(value)].filter(Boolean);
}

function toTimestamp(value) {
  if (!value) return 0;
  if (typeof value === 'number') return value;
  if (typeof value?.toMillis === 'function') return value.toMillis();
  const parsed = Date.parse(String(value));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function isUnknownTopic(title = '') {
  const normalized = normalizeText(title);
  if (!normalized) return true;
  if (UNKNOWN_TOPIC_PATTERN.test(normalized)) return true;
  if (normalized.length <= 2) return true;
  return false;
}

export function safeTopicTitle(title = '') {
  return isUnknownTopic(title) ? 'Topic not detected yet' : normalizeText(title);
}

export function normalizeKnowledgeItem(raw = {}) {
  const createdAt = raw.createdAt || raw.createdAtMs || new Date().toISOString();
  const updatedAt = raw.updatedAt || createdAt;
  const lastOpenedAt = raw.lastOpenedAt || '';
  const sourceType = normalizeText(raw.sourceType || raw.source || 'document').toLowerCase() || 'document';
  const tags = normalizeArray(raw.tags);
  const topics = normalizeArray(raw.topics);
  const keywords = normalizeArray(raw.keywords);
  const title = safeTopicTitle(raw.title || raw.topic || raw.sourceName || raw.fileName || '');

  return {
    id: normalizeText(raw.id),
    title,
    summary: normalizeText(raw.summary || raw.overview || ''),
    content: normalizeText(raw.content || raw.completeCourse || ''),
    sourceType,
    category: normalizeText(raw.category || 'Other'),
    difficulty: normalizeText(raw.difficulty || 'Medium'),
    language: normalizeText(raw.language || 'English'),
    completionStatus: normalizeText(raw.completionStatus || 'Not started'),
    progress: Number.isFinite(raw.progress) ? Math.max(0, Math.min(100, raw.progress)) : 0,
    favorite: Boolean(raw.favorite),
    bookmarked: Boolean(raw.bookmarked || raw.favorite),
    saved: raw.saved !== false,
    lessonCount: Number.isFinite(raw.lessonCount) ? raw.lessonCount : (Array.isArray(raw.lessons) ? raw.lessons.length : 0),
    noteCount: Number.isFinite(raw.noteCount) ? raw.noteCount : (Array.isArray(raw.notes) ? raw.notes.length : 0),
    tags,
    topics,
    keywords,
    collection: normalizeText(raw.collection || 'General'),
    lessons: Array.isArray(raw.lessons) ? raw.lessons : [],
    notes: Array.isArray(raw.notes) ? raw.notes : [],
    timeline: Array.isArray(raw.timeline) ? raw.timeline : [],
    createdAt,
    updatedAt,
    lastOpenedAt
  };
}

export function buildDefaultKnowledgeItem() {
  const nowIso = new Date().toISOString();
  return normalizeKnowledgeItem({
    id: `knowledge-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: 'Topic not detected yet',
    summary: 'Add topic context to generate lessons and recommendations.',
    sourceType: 'document',
    category: 'Other',
    difficulty: 'Medium',
    language: 'English',
    completionStatus: 'Not started',
    progress: 0,
    favorite: false,
    bookmarked: false,
    saved: true,
    lessonCount: 0,
    noteCount: 0,
    tags: [],
    topics: [],
    keywords: [],
    collection: 'General',
    lessons: [],
    notes: [],
    timeline: [],
    createdAt: nowIso,
    updatedAt: nowIso,
    lastOpenedAt: ''
  });
}

export function getLibraryMetrics(items = []) {
  const list = Array.isArray(items) ? items : [];
  return {
    totalItems: list.length,
    savedItems: list.filter((item) => item.saved).length,
    activeCourses: list.filter((item) => item.sourceType === 'course').length,
    bookmarks: list.filter((item) => item.bookmarked || item.favorite).length,
    recentlyViewed: list.filter((item) => toTimestamp(item.lastOpenedAt) > 0).length
  };
}

function matchesMode(item, mode) {
  const normalizedMode = normalizeText(mode);
  if (!normalizedMode || normalizedMode === 'All') return true;

  if (normalizedMode === 'My Library') return Boolean(item.saved || item.bookmarked || item.favorite);
  if (normalizedMode === 'Web knowledge') return ['website', 'web', 'article', 'blog'].includes(item.sourceType);
  if (normalizedMode === 'Documents') return ['document', 'pdf', 'docx', 'txt', 'markdown', 'pptx'].includes(item.sourceType);
  if (normalizedMode === 'Research') return ['research', 'paper', 'journal'].includes(item.sourceType);
  if (normalizedMode === 'Code') return ['code', 'github', 'repository', 'snippet'].includes(item.sourceType);
  if (normalizedMode === 'Courses') return ['course', 'academy'].includes(item.sourceType);

  return true;
}

function matchesTab(item, tab) {
  const normalizedTab = normalizeText(tab);
  if (!normalizedTab || normalizedTab === 'All') return true;
  if (normalizedTab === 'Saved') return Boolean(item.saved || item.bookmarked || item.favorite);
  if (normalizedTab === 'Recent') return toTimestamp(item.lastOpenedAt) > 0;
  if (normalizedTab === 'Documents') return ['document', 'pdf', 'docx', 'txt', 'markdown', 'pptx'].includes(item.sourceType);
  return item.sourceType === normalizedTab.toLowerCase().replace(/\s+/g, '-').replace('books', 'book');
}

function matchesDateFilter(item, value) {
  if (!value || value === 'Any time') return true;
  const now = Date.now();
  const timestamp = toTimestamp(item.createdAt);
  if (!timestamp) return false;

  if (value === 'Last 7 days') return now - timestamp <= 7 * 24 * 60 * 60 * 1000;
  if (value === 'Last 30 days') return now - timestamp <= 30 * 24 * 60 * 60 * 1000;
  if (value === 'Last 90 days') return now - timestamp <= 90 * 24 * 60 * 60 * 1000;

  return true;
}

function matchesSearch(item, query) {
  const normalizedQuery = normalizeText(query).toLowerCase();
  if (!normalizedQuery) return true;

  const source = SEARCHABLE_FIELDS
    .flatMap((field) => {
      const value = item[field];
      if (Array.isArray(value)) return value;
      return [value];
    })
    .map((value) => normalizeText(value).toLowerCase())
    .join(' ');

  return source.includes(normalizedQuery);
}

export function applyKnowledgeFilters(items = [], options = {}) {
  const {
    query = '',
    mode = 'All',
    tab = 'All',
    filters = {}
  } = options;

  return (Array.isArray(items) ? items : [])
    .filter((item) => matchesSearch(item, query))
    .filter((item) => matchesMode(item, mode))
    .filter((item) => matchesTab(item, tab))
    .filter((item) => !filters.category || filters.category === 'All' || item.category === filters.category)
    .filter((item) => !filters.sourceType || filters.sourceType === 'All' || item.sourceType === filters.sourceType)
    .filter((item) => !filters.difficulty || filters.difficulty === 'All' || item.difficulty === filters.difficulty)
    .filter((item) => !filters.language || filters.language === 'All' || item.language === filters.language)
    .filter((item) => matchesDateFilter(item, filters.dateAdded))
    .filter((item) => !filters.completionStatus || filters.completionStatus === 'All' || item.completionStatus === filters.completionStatus)
    .filter((item) => !filters.favorites || item.favorite)
    .sort((a, b) => toTimestamp(b.updatedAt || b.lastOpenedAt) - toTimestamp(a.updatedAt || a.lastOpenedAt));
}

export function buildRecommendations(items = [], activeItem = null) {
  const normalizedItems = Array.isArray(items) ? items : [];
  if (!normalizedItems.length) return [];

  const target = activeItem || normalizedItems[0];
  const targetTopics = new Set([...normalizeArray(target.topics), ...normalizeArray(target.keywords), target.category]);

  return normalizedItems
    .filter((item) => item.id !== target.id)
    .map((item) => {
      const itemTopics = [...normalizeArray(item.topics), ...normalizeArray(item.keywords), item.category];
      const overlap = itemTopics.filter((topic) => targetTopics.has(topic)).length;
      return { item, overlap };
    })
    .filter((entry) => entry.overlap > 0)
    .sort((a, b) => b.overlap - a.overlap)
    .slice(0, 6)
    .map((entry) => entry.item);
}
