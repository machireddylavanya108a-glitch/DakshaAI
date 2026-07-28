import { getDakshaLessonPackage } from './aiService.js';
import { buildContentIntelligenceProfile } from '../utils/contentIntelligenceEngine.js';
import { buildKnowledgeGraph } from '../utils/knowledgeGraphEngine.js';

const SOURCE_TYPE_MAP = {
  pdf: 'pdf',
  docx: 'docx',
  ppt: 'ppt',
  pptx: 'pptx',
  txt: 'txt',
  md: 'markdown',
  markdown: 'markdown',
  html: 'html',
  htm: 'html',
  epub: 'epub',
  zip: 'zip',
  jpg: 'image',
  jpeg: 'image',
  png: 'image',
  webp: 'image',
  gif: 'image',
  mp3: 'audio',
  wav: 'audio',
  m4a: 'audio',
  mp4: 'video',
  mov: 'video',
  avi: 'video',
  mkv: 'video'
};

function safeString(value) {
  return String(value || '').trim();
}

function normalizeList(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === 'string') {
    return value.split(/\n|•|- /).map((item) => item.trim()).filter(Boolean).slice(0, 12);
  }
  return [];
}

function extensionFromName(name = '') {
  const lower = String(name).toLowerCase();
  const match = lower.match(/\.([a-z0-9]+)$/i);
  return match ? match[1] : '';
}

function detectSourceType({ file, url, sourceHint }) {
  if (sourceHint) return sourceHint;
  const lowerUrl = safeString(url).toLowerCase();
  if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) return 'youtube';
  if (lowerUrl.includes('github.com')) return 'github';
  if (lowerUrl.includes('docs.google.com') || lowerUrl.includes('drive.google.com')) return 'google-docs';
  if (lowerUrl.includes('onedrive')) return 'onedrive';
  if (lowerUrl.includes('dropbox')) return 'dropbox';
  if (lowerUrl.startsWith('http://') || lowerUrl.startsWith('https://')) return 'website';

  const ext = extensionFromName(file?.name || '');
  if (ext && SOURCE_TYPE_MAP[ext]) return SOURCE_TYPE_MAP[ext];

  const mime = safeString(file?.type).toLowerCase();
  if (mime.includes('pdf')) return 'pdf';
  if (mime.includes('word')) return 'docx';
  if (mime.includes('presentation')) return 'pptx';
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('audio/')) return 'audio';
  if (mime.startsWith('video/')) return 'video';
  if (mime.includes('zip')) return 'zip';
  if (mime.includes('html')) return 'html';
  if (mime.includes('markdown')) return 'markdown';
  if (mime.includes('text')) return 'txt';

  return 'text';
}

async function loadMammoth() {
  const module = await import('mammoth');
  return module.default || module;
}

async function loadJSZip() {
  const module = await import('jszip');
  return module.default || module;
}

function decodeHtml(text = '') {
  if (typeof DOMParser === 'undefined') return text;
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, 'text/html');
    return safeString(doc.body?.innerText || text);
  } catch {
    return text;
  }
}

async function extractTextFromZip(file) {
  const JSZip = await loadJSZip();
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const textParts = [];
  const slideFiles = [];

  zip.forEach((relativePath, entry) => {
    if (/ppt\/slides\/slide\d+\.xml$/i.test(relativePath)) {
      slideFiles.push({ relativePath, entry });
    }
  });

  if (slideFiles.length) {
    slideFiles.sort((a, b) => a.relativePath.localeCompare(b.relativePath, undefined, { numeric: true }));
    const slides = [];
    for (let index = 0; index < slideFiles.length; index += 1) {
      const xml = await slideFiles[index].entry.async('string').catch(() => '');
      const tokens = Array.from(xml.matchAll(/<a:t>(.*?)<\/a:t>/gs)).map((item) => safeString(item[1])).filter(Boolean);
      const title = tokens[0] || `Slide ${index + 1}`;
      const bullets = tokens.slice(1, 7);
      textParts.push(title, ...bullets);
      slides.push({
        id: `slide-${index + 1}`,
        title,
        text: bullets.length ? [bullets.join(' ')] : [],
        bullets,
        tables: /<a:tbl/i.test(xml) ? ['Table detected'] : [],
        charts: /<c:chart/i.test(xml) ? ['Chart detected'] : [],
        diagrams: /diagram|flow|process/i.test(xml) ? ['Diagram detected'] : [],
        images: /<p:pic|<a:blip/i.test(xml) ? ['Image detected'] : [],
        notes: []
      });
    }

    return {
      extractedText: textParts.join('\n'),
      slides
    };
  }

  const textEntries = [];
  zip.forEach((relativePath, entry) => {
    if (/\.(txt|md|markdown|html|htm|csv|json|xml)$/i.test(relativePath)) {
      textEntries.push({ relativePath, entry });
    }
  });

  for (const item of textEntries.slice(0, 40)) {
    const raw = await item.entry.async('string').catch(() => '');
    if (/\.(html|htm)$/i.test(item.relativePath)) {
      textParts.push(decodeHtml(raw));
    } else {
      textParts.push(raw);
    }
  }

  return {
    extractedText: textParts.join('\n')
  };
}

async function extractTextFromFile(file, sourceType) {
  if (!file) return { extractedText: '', slides: [] };

  if (sourceType === 'docx') {
    const mammoth = await loadMammoth();
    const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
    return { extractedText: result?.value || '' };
  }

  if (sourceType === 'ppt' || sourceType === 'pptx' || sourceType === 'zip' || sourceType === 'epub') {
    return extractTextFromZip(file);
  }

  if (sourceType === 'html') {
    const raw = new TextDecoder().decode(await file.arrayBuffer());
    return { extractedText: decodeHtml(raw) };
  }

  if (sourceType === 'markdown' || sourceType === 'txt' || sourceType === 'pdf' || sourceType === 'text') {
    const raw = new TextDecoder().decode(await file.arrayBuffer());
    return { extractedText: raw };
  }

  if (sourceType === 'image' || sourceType === 'camera-ocr') {
    return { extractedText: '' };
  }

  if (sourceType === 'audio' || sourceType === 'video' || sourceType === 'youtube') {
    return { extractedText: '' };
  }

  const fallback = new TextDecoder().decode(await file.arrayBuffer());
  return { extractedText: fallback };
}

function detectLanguage(text = '') {
  if (!text) return 'Unknown';
  if (/[\u0C00-\u0C7F]/.test(text)) return 'Telugu';
  if (/[\u0900-\u097F]/.test(text)) return 'Hindi';
  if (/[\u4E00-\u9FFF]/.test(text)) return 'Chinese';
  return 'English';
}

function detectSubject(text = '') {
  const normalized = text.toLowerCase();
  const subjectKeywords = [
    ['Mathematics', /(equation|algebra|calculus|theorem|matrix|integral)/],
    ['Physics', /(force|motion|energy|quantum|velocity|acceleration)/],
    ['Chemistry', /(molecule|reaction|compound|acid|base|periodic)/],
    ['Biology', /(cell|organism|genetics|anatomy|evolution|enzyme)/],
    ['Computer Science', /(algorithm|function|class|database|network|code|programming)/],
    ['Economics', /(market|inflation|gdp|demand|supply|fiscal)/],
    ['Business', /(strategy|management|leadership|operations|revenue)/],
    ['Medicine', /(diagnosis|treatment|patient|clinical|surgery)/],
    ['Engineering', /(design|system|circuit|manufacturing|prototype)/]
  ];

  const matched = subjectKeywords.find(([, regex]) => regex.test(normalized));
  return matched ? matched[0] : 'General Learning';
}

function detectDifficulty(text = '') {
  const normalized = text.toLowerCase();
  const hardSignals = (normalized.match(/(advanced|complex|optimize|proof|architecture|trade-off|derivation)/g) || []).length;
  const easySignals = (normalized.match(/(intro|basic|simple|beginner|overview|foundation)/g) || []).length;
  if (hardSignals >= 5) return 'Expert';
  if (hardSignals >= 3) return 'Hard';
  if (easySignals >= 4) return 'Beginner';
  if (easySignals >= 2) return 'Easy';
  return 'Medium';
}

function detectElements(text = '', sourceType = 'text') {
  const normalized = text || '';
  const lines = normalized.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const tables = normalized.match(/\|[^\n]+\|/g) || [];
  const formulas = normalized.match(/([A-Za-z0-9\s=+\-*/()^]+={1,2}[^\n]+)/g) || [];
  const codeBlocks = normalized.match(/(```[\s\S]*?```|`[^\n`]+`|\b(function|class|const|let|var|def|public static)\b)/g) || [];
  const diagrams = lines.filter((line) => /diagram|figure|flow|architecture|process map|pipeline/i.test(line));
  const images = lines.filter((line) => /image|img|figure|screenshot|photo|visual/i.test(line));
  const practicalSkills = lines.filter((line) => /hands-on|lab|project|procedure|experiment|implementation|simulation|practical/i.test(line));
  const headings = lines.filter((line) => line.length < 120 && /^(#|chapter|section|part|topic|introduction|summary|conclusion)/i.test(line));
  const definitions = lines.filter((line) => /\b(is|means|defined as|refers to)\b/i.test(line) && line.length < 180).slice(0, 12);

  return {
    headings,
    tables,
    formulas,
    diagrams,
    images,
    codeBlocks,
    practicalSkills,
    definitions,
    hasTables: tables.length > 0,
    hasFormulas: formulas.length > 0,
    hasDiagrams: diagrams.length > 0,
    hasImages: images.length > 0 || sourceType === 'image' || sourceType === 'camera-ocr',
    hasCode: codeBlocks.length > 0
  };
}

function buildSourceModel({ sourceName, sourceType, extractedText, slides, intelligenceProfile }) {
  const text = safeString(extractedText);
  const lines = text.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const intelligenceTitle = intelligenceProfile?.title || sourceName;
  const detections = detectElements(text, sourceType);
  const sections = detections.headings.length ? detections.headings : lines.slice(0, 10);

  const transcript = lines.slice(0, 24).map((line, index) => ({
    timestamp: `00:${String(index * 15).padStart(2, '0')}`,
    title: `Segment ${index + 1}`,
    text: line
  }));

  return {
    title: intelligenceTitle,
    url: sourceType === 'website' || sourceType === 'youtube' ? sourceName : '',
    overview: text.slice(0, 2800) || `No extracted text for ${sourceType}.`,
    content: text,
    extractedText: text,
    sections: sections.slice(0, 12),
    subSections: lines.slice(0, 18),
    chapters: sections.slice(0, 10),
    headings: sections.slice(0, 10),
    subheadings: lines.slice(0, 14),
    tables: detections.tables.slice(0, 12),
    formulas: detections.formulas.slice(0, 12),
    codeBlocks: detections.codeBlocks.slice(0, 12),
    definitions: detections.definitions.slice(0, 12),
    diagrams: detections.diagrams.slice(0, 12),
    images: detections.images.slice(0, 12),
    concepts: lines.slice(0, 10),
    importantConcepts: lines.slice(0, 10),
    topics: sections.slice(0, 8),
    transcript,
    timestamps: transcript.map((item) => ({ timestamp: item.timestamp, title: item.title })),
    slides: Array.isArray(slides) && slides.length ? slides : lines.slice(0, 8).map((line, index) => ({
      id: `slide-${index + 1}`,
      title: line.slice(0, 80) || `Slide ${index + 1}`,
      text: [line],
      bullets: [line],
      tables: [],
      charts: [],
      diagrams: [],
      images: [],
      notes: []
    })),
    notes: [],
    charts: [],
    bookmarks: []
  };
}

function buildLessonSession(packageData, sourceModel, detections, metadata, intelligenceProfile) {
  const fallbackPackage = packageData && typeof packageData === 'object' ? packageData : {};
  const summary = safeString(fallbackPackage.summary || fallbackPackage.completeCourse || fallbackPackage.beginnerExplanation || sourceModel.overview || metadata.subject).slice(0, 3000);
  const beginnerLesson = safeString(fallbackPackage.beginnerLesson || fallbackPackage.beginnerExplanation || summary || `Start with the key ideas from ${metadata.subject || 'this lesson'} and build understanding from the main concepts first.`);
  const intermediateLesson = safeString(packageData.intermediateLesson || packageData.intermediateExplanation || beginnerLesson);
  const advancedLesson = safeString(packageData.advancedLesson || packageData.advancedExplanation || intermediateLesson);
  const keyConcepts = normalizeList(fallbackPackage.keyConcepts || fallbackPackage.realWorldExamples || sourceModel.sections).slice(0, 10);
  const importantDefinitions = normalizeList(fallbackPackage.importantDefinitions || sourceModel.definitions).slice(0, 10);
  const examples = normalizeList(fallbackPackage.examples || fallbackPackage.realWorldExamples).slice(0, 10);
  const realWorldApplications = normalizeList(fallbackPackage.realWorldApplications || fallbackPackage.realWorldExamples).slice(0, 8);
  const revisionNotes = normalizeList(fallbackPackage.revisionNotes || fallbackPackage.revisionNotesText || sourceModel.sections).slice(0, 10);
  const cheatSheet = normalizeList(fallbackPackage.cheatSheet || sourceModel.sections).slice(0, 10);
  const flashcards = Array.isArray(fallbackPackage.flashcards) ? fallbackPackage.flashcards : [];
  const quiz = Array.isArray(fallbackPackage.quiz) ? fallbackPackage.quiz : [];
  const practiceQuestions = Array.isArray(fallbackPackage.practiceQuestions) ? fallbackPackage.practiceQuestions : quiz.map((item) => item.question).filter(Boolean);

  return {
    title: intelligenceProfile?.title || sourceModel.title || metadata.sourceName || 'Adaptive lesson',
    summary,
    beginnerLesson,
    intermediateLesson,
    advancedLesson,
    keyConcepts: intelligenceProfile?.keyConcepts || keyConcepts,
    importantDefinitions,
    examples,
    realWorldApplications,
    revisionNotes,
    cheatSheet,
    flashcards,
    quiz,
    mindMap: safeString(packageData.mindMap || packageData.learningRoadmap || `${metadata.subject} -> concepts -> practice`),
    learningRoadmap: normalizeList(packageData.learningRoadmap || packageData.interviewQuestions || sourceModel.sections).slice(0, 12),
    aiTeacher: {
      script: beginnerLesson,
      language: metadata.language,
      style: 'adaptive'
    },
    lesson3d: {
      topic: intelligenceProfile?.subject || metadata.subject,
      highlightObjects: keyConcepts.slice(0, 4),
      practicalMode: detections.practicalSkills.length > 0
    },
    interactiveDiagrams: detections.diagrams.slice(0, 6),
    voiceExplanation: {
      language: metadata.language,
      narration: summary
    },
    notes: {
      concise: revisionNotes,
      full: cheatSheet
    },
    practice: {
      questions: practiceQuestions,
      adaptiveDifficulty: metadata.difficulty
    },
    memoryUpdate: {
      knownConcepts: keyConcepts.slice(0, 6),
      weakConcepts: keyConcepts.slice(6, 10),
      sourceType: metadata.sourceType
    },
    progressUpdate: {
      completionDelta: 8,
      streakImpact: 1,
      recommendedNext: keyConcepts[0] || metadata.subject
    }
  };
}

export function buildUniversalLearningArtifacts({ sourceMeta, sourceModel, learningSession, detections }) {
  const quiz = Array.isArray(learningSession?.quiz) ? learningSession.quiz : [];
  const flashcards = Array.isArray(learningSession?.flashcards) ? learningSession.flashcards : [];
  const keyConcepts = Array.isArray(learningSession?.keyConcepts) ? learningSession.keyConcepts : [];
  const definitions = Array.isArray(learningSession?.importantDefinitions) ? learningSession.importantDefinitions : [];
  const roadmap = Array.isArray(learningSession?.learningRoadmap) ? learningSession.learningRoadmap : [];
  const practiceQuestions = Array.isArray(learningSession?.practice?.questions) ? learningSession.practice.questions : [];
  const notes = learningSession?.notes || {};

  const aiTeacher = {
    ...learningSession?.aiTeacher,
    language: sourceMeta?.language || learningSession?.aiTeacher?.language || 'English',
    style: learningSession?.aiTeacher?.style || 'adaptive'
  };

  const knowledgeGraph = buildKnowledgeGraph({
    topic: sourceMeta?.subject || learningSession?.title || 'Universal lesson',
    prereqs: Array.isArray(sourceMeta?.topics) ? sourceMeta.topics.slice(0, 3) : [],
    relatedTopics: Array.isArray(sourceMeta?.topics) ? sourceMeta.topics.slice(0, 3) : [],
    advancedTopics: Array.isArray(sourceMeta?.subtopics) ? sourceMeta.subtopics.slice(0, 3) : [],
    similarTopics: Array.isArray(sourceMeta?.chapters) ? sourceMeta.chapters.slice(0, 3) : [],
    revisions: Array.isArray(learningSession?.revisionNotes) ? learningSession.revisionNotes.slice(0, 3) : [],
    sourceText: sourceModel?.extractedText || learningSession?.summary || ''
  });

  const lessonSuite = {
    completeCourse: learningSession?.summary || sourceModel?.overview || '',
    beginnerExplanation: learningSession?.beginnerLesson || '',
    intermediateExplanation: learningSession?.intermediateLesson || '',
    advancedExplanation: learningSession?.advancedLesson || '',
    summary: learningSession?.summary || '',
    learningRoadmap: roadmap,
    cheatSheet: learningSession?.cheatSheet || notes?.full || [],
    mindMap: learningSession?.mindMap || '',
    revisionNotes: learningSession?.revisionNotes || notes?.concise || [],
    realWorldExamples: learningSession?.realWorldApplications || [],
    interviewQuestions: [],
    practiceQuestions,
    quiz,
    flashcards,
    keyConcepts,
    importantDefinitions: definitions,
    learningSession,
    knowledgeGraph,
    sourceModel,
    sourceMeta,
    detections,
    aiTeacher,
    lesson3d: {
      topic: sourceMeta?.subject || learningSession?.title || 'Universal lesson',
      summary: learningSession?.summary || '',
      highlightObjects: keyConcepts.slice(0, 4),
      practicalMode: Boolean(detections?.practicalSkills?.length)
    },
    roadmap: roadmap.map((item) => ({ title: item })),
    practice: {
      questions: practiceQuestions,
      adaptiveDifficulty: learningSession?.practice?.adaptiveDifficulty || sourceMeta?.difficulty || 'Medium'
    },
    notes: {
      concise: notes?.concise || [],
      full: notes?.full || []
    },
    mindMapEntry: learningSession?.mindMap || '',
    memoryEntry: {
      sourceType: sourceMeta?.sourceType || 'universal',
      topic: sourceMeta?.subject || learningSession?.title || 'Universal lesson',
      concepts: keyConcepts.slice(0, 8),
      summary: learningSession?.summary || ''
    },
    progressEntry: {
      topic: sourceMeta?.subject || learningSession?.title || 'Universal lesson',
      progressPercent: 12,
      recommendedNext: learningSession?.progressUpdate?.recommendedNext || keyConcepts[0] || 'Start learning',
      status: 'ready_to_start'
    }
  };

  return lessonSuite;
}

export async function runUniversalLearningPipeline({
  file = null,
  url = '',
  text = '',
  sourceHint = '',
  ocrText = '',
  sourceName = ''
} = {}) {
  const sourceType = detectSourceType({ file, url, sourceHint });
  const normalizedName = sourceName || file?.name || url || `${sourceType}-source`;

  let extracted = {
    extractedText: safeString(text)
  };

  if (file) {
    extracted = await extractTextFromFile(file, sourceType);
  }

  if (!extracted.extractedText && ocrText) {
    extracted.extractedText = ocrText;
  }

  if (!extracted.extractedText && url) {
    extracted.extractedText = `${sourceType === 'youtube' ? 'YouTube' : 'Website'} learning source: ${url}`;
  }

  const intelligenceProfile = buildContentIntelligenceProfile({
    sourceText: extracted.extractedText,
    sourceName: normalizedName,
    sourceType,
    visionSummary: extracted.visionSummary || ''
  });

  const sourceModel = buildSourceModel({
    sourceName: normalizedName,
    sourceType,
    extractedText: extracted.extractedText,
    slides: extracted.slides,
    intelligenceProfile
  });

  const detections = detectElements(sourceModel.extractedText, sourceType);
  const metadata = {
    sourceType,
    sourceName: normalizedName,
    language: detectLanguage(sourceModel.extractedText),
    subject: detectSubject(sourceModel.extractedText),
    difficulty: detectDifficulty(sourceModel.extractedText),
    detectDiagrams: detections.hasDiagrams,
    detectFormulas: detections.hasFormulas,
    detectTables: detections.hasTables,
    detectImages: detections.hasImages,
    detectCode: detections.hasCode,
    detectPracticalSkills: detections.practicalSkills.length > 0
  };

  let packagePayload = await getDakshaLessonPackage(
    sourceModel.extractedText || `${metadata.subject} ${metadata.sourceType}`,
    metadata.sourceType,
    metadata.sourceName
  );

  if (!packagePayload || typeof packagePayload !== 'object') {
    packagePayload = {};
  }

  const learningSession = buildLessonSession(packagePayload, sourceModel, detections, metadata, intelligenceProfile);

  return {
    sourceMeta: {
      ...metadata,
      title: intelligenceProfile?.title || metadata.sourceName,
      subject: intelligenceProfile?.subject || metadata.subject,
      chapters: intelligenceProfile?.chapters || [],
      topics: intelligenceProfile?.topics || [],
      subtopics: intelligenceProfile?.subtopics || [],
      difficulty: intelligenceProfile?.difficulty || metadata.difficulty,
      learningObjectives: intelligenceProfile?.learningObjectives || [],
      keyConcepts: intelligenceProfile?.keyConcepts || [],
      skills: intelligenceProfile?.skills || [],
      entities: intelligenceProfile?.entities || [],
      relationships: intelligenceProfile?.relationships || [],
      intelligenceProfile,
      followUpPrompt: intelligenceProfile?.followUpPrompt || ''
    },
    detections,
    sourceModel,
    learningSession,
    packagePayload,
    intelligenceProfile
  };
}
