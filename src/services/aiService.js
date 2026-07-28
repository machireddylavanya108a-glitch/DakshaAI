import OpenAI from 'openai';
import { compressImageDataUrl, getCachedValue, setCachedValue, getIndexedDBItem, setIndexedDBItem } from '../utils/cache.js';
import { sanitizePrompt } from '../utils/security.js';
import { splitTextIntoChunks, TaskQueue, withRetry } from '../utils/productionOptimizations.js';
import { getConfiguredTextModels, getConfiguredVisionModels } from '../config/aiModels.js';
import { AI_CONFIG, reportAiConfigWarnings } from '../config/aiConfig.js';

const runtimeEnv = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : {};
const openaiApiKey = AI_CONFIG.apiKey;
const appOrigin = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : (runtimeEnv.VITE_APP_URL || 'https://daksha.ai');

reportAiConfigWarnings(console);

const openai = openaiApiKey
  ? new OpenAI({
      apiKey: openaiApiKey,
      baseURL: AI_CONFIG.baseUrl,
      dangerouslyAllowBrowser: true,
      defaultHeaders: {
        Authorization: `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': appOrigin,
        'X-Title': 'Daksha AI'
      }
    })
  : null;

const aiTaskQueue = new TaskQueue({ concurrency: 2, retries: 2, retryDelay: 250 });

const MAX_TOKEN_HARD_CAP = 4096;
const TOKEN_BUDGETS = {
  summary: 800,
  lesson: 2500,
  quiz: 1000,
  flashcards: 800,
  mindmap: 800,
  roadmap: 1200,
  vision: 800,
  default: 1800
};

function clampMaxTokens(value, fallback = TOKEN_BUDGETS.default) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return fallback;
  return Math.max(400, Math.min(MAX_TOKEN_HARD_CAP, Math.round(numeric)));
}

function inferTaskFromMessages(messages = [], requestType = 'text') {
  if (requestType === 'vision') return 'vision';
  const flattened = (messages || [])
    .map((item) => {
      if (typeof item?.content === 'string') return item.content;
      if (Array.isArray(item?.content)) {
        return item.content.map((part) => part?.text || '').join(' ');
      }
      return '';
    })
    .join(' ')
    .toLowerCase();

  if (flattened.includes('flashcard')) return 'flashcards';
  if (flattened.includes('quiz')) return 'quiz';
  if (flattened.includes('roadmap')) return 'roadmap';
  if (flattened.includes('mind map') || flattened.includes('mindmap')) return 'mindmap';
  if (flattened.includes('summary') || flattened.includes('summarize')) return 'summary';
  return 'lesson';
}

function resolveTaskTokenBudget(task = 'default', requestType = 'text') {
  if (requestType === 'vision') return TOKEN_BUDGETS.vision;
  return TOKEN_BUDGETS[task] || TOKEN_BUDGETS.default;
}

function buildTokenAttemptPlan(maxTokens) {
  const base = clampMaxTokens(maxTokens);
  return Array.from(new Set([
    base,
    Math.min(base, 3000),
    Math.min(base, 2500),
    Math.min(base, 1500),
    1000,
    800
  ].map((value) => clampMaxTokens(value)).filter(Boolean)));
}

function compactMessages(messages = [], maxChars = 9000) {
  let remaining = Math.max(1000, Math.round(maxChars));
  return (messages || []).map((message) => {
    if (remaining <= 0) return { ...message, content: '' };

    if (typeof message?.content === 'string') {
      const next = message.content.slice(0, remaining);
      remaining -= next.length;
      return { ...message, content: next };
    }

    if (Array.isArray(message?.content)) {
      const nextContent = message.content.map((part) => {
        if (!part?.text || remaining <= 0) return part;
        const text = String(part.text).slice(0, remaining);
        remaining -= text.length;
        return { ...part, text };
      });
      return { ...message, content: nextContent };
    }

    return message;
  });
}

function isCreditOrTokenLimitError(error) {
  const status = getStatusCode(error);
  const message = String(error?.message || error?.error?.message || '').toLowerCase();
  return status === 402
    || message.includes('requires more credits')
    || message.includes('insufficient credits')
    || message.includes('fewer max_tokens')
    || message.includes('max tokens');
}

function hasAiCredentials() {
  return Boolean(openaiApiKey);
}

function getMissingAuthMessage() {
  return 'AI is not configured yet. Add VITE_OPENROUTER_API_KEY to your environment to enable generation.';
}

function buildStructuredFallbackResponse(prompt = '', language = 'English') {
  const normalizedPrompt = String(prompt || '').trim();
  const promptHint = normalizedPrompt ? normalizedPrompt.slice(0, 120) : 'your uploaded material';
  return `I can help you study ${promptHint}. Start by reviewing the main ideas, then build a short summary, a few flashcards, and one practice question in ${language}.`;
}

function buildLessonFallbackPackage(sourceText = '', sourceName = 'topic', context = 'topic') {
  const sourceHint = String(sourceText || sourceName || context || 'this learning material').trim().slice(0, 1400);
  return {
    completeCourse: `A useful lesson map was built from the available content. Key ideas from ${sourceName || context} include: ${sourceHint}`,
    beginnerExplanation: `Start by reviewing the main ideas in ${sourceName || context} and build understanding from the key concepts it contains.`,
    intermediateExplanation: `Connect the main ideas to practical examples and review the important relationships in the content.`,
    advancedExplanation: `Use the material to deepen your understanding with comparisons, practice questions, and self-review.`,
    realWorldExamples: ['Connect the lesson to a practical scenario from daily life or work.'],
    interviewQuestions: ['What is the main idea of this material?', 'How would you explain this topic in simple terms?'],
    practiceQuestions: ['Summarize the key takeaway from this lesson.', 'List the most important concepts and explain them.'],
    quiz: [],
    flashcards: [],
    revisionNotes: sourceHint,
    cheatSheet: sourceHint,
    mindMap: `${sourceName || context} -> concepts -> practice -> review`,
    learningRoadmap: ['Understand the main topic', 'Break the material into concepts', 'Practice recall and examples']
  };
}

function buildVisionFallbackText(sourceText = '', mimeType = 'image/png') {
  const hint = String(sourceText || '').trim();
  const label = mimeType || 'image';
  if (hint) {
    return `I couldn't confidently interpret this ${label} yet. Please tell me what the image contains, and I will turn it into a lesson plan. I also extracted these clues: ${hint.slice(0, 320)}.`;
  }
  return `I couldn't confidently interpret this image yet. Please tell me what the image contains, and I will turn it into a lesson plan.`;
}

function normalizeImageDataUrl(imageInput = '', mimeType = 'image/png') {
  const raw = String(imageInput || '').trim();
  if (!raw) return '';
  if (raw.startsWith('data:image')) return raw;
  return `data:${mimeType};base64,${raw}`;
}

function toModelTextContent(content) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((entry) => {
        if (typeof entry === 'string') return entry;
        if (entry?.text) return entry.text;
        return '';
      })
      .filter(Boolean)
      .join('\n');
  }
  return String(content || '');
}

function getStatusCode(error) {
  if (!error) return null;
  if (typeof error?.status === 'number') return error.status;
  const code = Number(error?.statusCode || error?.code || error?.response?.status || error?.status_code);
  return Number.isFinite(code) ? code : null;
}

function isRetryableModelError(error) {
  const status = getStatusCode(error);
  return [400, 401, 402, 404, 429, 500, 502, 503].includes(status);
}

async function callModelWithFallback({
  requestType,
  messages,
  models = [],
  task,
  maxTokens,
  timeoutMs = 20000
}) {
  if (!openai) {
    throw new Error('OpenRouter is not configured.');
  }

  const candidateModels = Array.isArray(models) ? models.filter(Boolean) : [];
  if (!candidateModels.length) {
    throw new Error('No model configured');
  }

  const payload = { messages };
  if (!Array.isArray(messages) || !messages.length) {
    throw new Error('Invalid request payload');
  }

  let lastError;
  const inferredTask = task || inferTaskFromMessages(messages, requestType);
  const initialTokenBudget = clampMaxTokens(maxTokens || resolveTaskTokenBudget(inferredTask, requestType));

  for (const model of candidateModels) {
    let promptCompacted = false;
    let requestMessages = messages;
    let tokenAttempts = buildTokenAttemptPlan(initialTokenBudget);

    for (let attemptIndex = 0; attemptIndex < tokenAttempts.length; attemptIndex += 1) {
      const tokenBudget = tokenAttempts[attemptIndex];

      try {
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('AI request timed out.')), timeoutMs);
        });
        const requestPromise = openai.chat.completions.create({
          model,
          messages: requestMessages,
          max_tokens: tokenBudget
        });
        const response = await Promise.race([requestPromise, timeoutPromise]);
        return { response, model };
      } catch (error) {
        lastError = error;

        if (isCreditOrTokenLimitError(error)) {
          const lastAttempt = attemptIndex === tokenAttempts.length - 1;
          if (lastAttempt && !promptCompacted) {
            requestMessages = compactMessages(messages, 7000);
            tokenAttempts = buildTokenAttemptPlan(1200);
            promptCompacted = true;
            attemptIndex = -1;
            continue;
          }
          continue;
        }

        if (!isRetryableModelError(error)) {
          break;
        }
      }
    }
  }
  throw lastError || new Error('AI request failed');
}

const DAKSHA_SYSTEM_PROMPT = `You are Daksha AI, the Universal Knowledge Operating System.
Rules:
- Never introduce yourself unless the user asks who you are.
- Never repeat "Hello! I am Daksha AI."
- Answer immediately.
- Be natural and conversational like ChatGPT.
- Give concise answers for simple questions.
- Give detailed explanations for learning requests.
- Explain difficult topics in simple language.
- If the user asks for code, provide complete working code.
- If the user asks for business ideas, act like a startup mentor.
- If the user asks about studying, become an expert teacher.
- Support 100+ languages and always reply in the user's chosen language.
- Ask follow-up questions only when necessary.
- Think step by step before answering.`;

function parseJsonResponse(content) {
  const normalized = String(content || '').trim();
  if (!normalized) return null;

  const direct = tryParseJson(normalized);
  if (direct) return direct;

  const withoutFences = stripMarkdownFences(normalized);
  const candidate = extractJSONObjectCandidate(withoutFences);
  if (!candidate) return null;

  const parsedCandidate = tryParseJson(candidate);
  if (parsedCandidate) return parsedCandidate;

  const repaired = repairJsonLikeString(candidate);
  const parsedRepaired = tryParseJson(repaired);
  if (parsedRepaired) return parsedRepaired;

  console.warn('JSON parse fallback failed after repair attempts.');
  return null;
}

function tryParseJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function stripMarkdownFences(value = '') {
  return String(value || '')
    .replace(/```json/gi, '```')
    .replace(/```/g, '')
    .trim();
}

function extractJSONObjectCandidate(value = '') {
  const text = String(value || '');
  const start = text.indexOf('{');
  if (start < 0) return '';

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < text.length; index += 1) {
    const char = text[index];
    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === '\\') {
      escaped = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return text.slice(start, index + 1);
      }
    }
  }

  return text.slice(start);
}

function repairJsonLikeString(value = '') {
  return String(value || '')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/,\s*([}\]])/g, '$1')
    .replace(/([{,]\s*)([A-Za-z_][A-Za-z0-9_\-]*)(\s*:)/g, '$1"$2"$3')
    .trim();
}

function isRawJsonLike(value) {
  if (value && typeof value === 'object') return true;
  const text = String(value || '').trim();
  if (!text) return false;
  if (/^\s*[\[{]/.test(text)) return true;
  return /"(completeCourse|beginnerExplanation|intermediateExplanation|advancedExplanation|title|modules|quiz|flashcards)"\s*:/.test(text);
}

function sanitizePlainLearningText(value = '') {
  return String(value || '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/[{}\[\]"]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeModules(input = []) {
  if (!Array.isArray(input)) return [];
  return input
    .map((entry, index) => {
      if (typeof entry === 'string') {
        return { title: entry, details: '' };
      }
      if (!entry || typeof entry !== 'object') {
        return { title: `Module ${index + 1}`, details: '' };
      }
      const title = String(entry.title || entry.name || entry.module || `Module ${index + 1}`).trim();
      const details = String(entry.description || entry.content || entry.summary || '').trim();
      return { title, details };
    })
    .filter((entry) => entry.title)
    .slice(0, 12);
}

function normalizeCourseStructure(completeCourse, sourceName = 'topic', context = 'topic') {
  if (completeCourse && typeof completeCourse === 'object') {
    const title = String(completeCourse.title || completeCourse.course_title || completeCourse.name || sourceName || 'Adaptive course').trim();
    const summary = String(completeCourse.summary || completeCourse.overview || completeCourse.description || '').trim();
    const modules = normalizeModules(
      completeCourse.modules
      || completeCourse.lessons
      || completeCourse.sections
      || completeCourse.outline?.sections
      || []
    );
    return { title, summary, modules };
  }

  const text = sanitizePlainLearningText(completeCourse);
  const title = String(sourceName || context || 'Adaptive course').trim();
  return { title, summary: text.slice(0, 800), modules: [] };
}

function serializeCourseStructure(course = {}) {
  const title = String(course.title || '').trim();
  const summary = String(course.summary || '').trim();
  const moduleLines = (course.modules || [])
    .map((module, index) => {
      const heading = `${index + 1}. ${module.title}`;
      return module.details ? `${heading}\n${module.details}` : heading;
    });

  return [title, summary, ...moduleLines].filter(Boolean).join('\n\n').trim();
}

function buildLevelExplanation(level = 'Beginner', courseTitle = 'this topic', sourceName = 'topic', context = 'topic') {
  if (level === 'Beginner') {
    return `Start with the foundations of ${courseTitle}. Focus on what it is, why it matters, and one simple workflow you can repeat confidently.`;
  }
  if (level === 'Intermediate') {
    return `Move from basics to practice in ${courseTitle}. Connect concepts to features, compare options, and complete a realistic workflow end-to-end.`;
  }
  return `Treat ${courseTitle} as a professional skill. Evaluate trade-offs, optimize your setup, and apply advanced patterns for speed and reliability.`;
}

function normalizeExplanation(value, fallback, courseText = '') {
  const text = sanitizePlainLearningText(value);
  if (!text) return fallback;
  if (isRawJsonLike(value)) return fallback;

  const normalizedCourse = sanitizePlainLearningText(courseText).slice(0, 1400);
  const normalizedText = sanitizePlainLearningText(text).slice(0, 1400);
  if (normalizedCourse && normalizedText && (normalizedText === normalizedCourse || normalizedText.includes(normalizedCourse.slice(0, 220)))) {
    return fallback;
  }
  return text;
}

function normalizeLessonPackagePayload(payload = {}, sourceName = 'topic', context = 'topic') {
  const normalizedPayload = payload && typeof payload === 'object' ? payload : {};
  const course = normalizeCourseStructure(normalizedPayload.completeCourse, sourceName, context);
  const completeCourseText = serializeCourseStructure(course) || sanitizePlainLearningText(sourceName || context || 'Adaptive course');

  const beginnerFallback = buildLevelExplanation('Beginner', course.title || sourceName || context, sourceName, context);
  const intermediateFallback = buildLevelExplanation('Intermediate', course.title || sourceName || context, sourceName, context);
  const advancedFallback = buildLevelExplanation('Advanced', course.title || sourceName || context, sourceName, context);

  return {
    completeCourse: completeCourseText,
    beginnerExplanation: normalizeExplanation(normalizedPayload.beginnerExplanation || normalizedPayload.beginnerLesson, beginnerFallback, completeCourseText),
    intermediateExplanation: normalizeExplanation(normalizedPayload.intermediateExplanation || normalizedPayload.intermediateLesson, intermediateFallback, completeCourseText),
    advancedExplanation: normalizeExplanation(normalizedPayload.advancedExplanation || normalizedPayload.advancedLesson, advancedFallback, completeCourseText),
    realWorldExamples: Array.isArray(normalizedPayload.realWorldExamples) ? normalizedPayload.realWorldExamples : [],
    interviewQuestions: Array.isArray(normalizedPayload.interviewQuestions) ? normalizedPayload.interviewQuestions : [],
    practiceQuestions: Array.isArray(normalizedPayload.practiceQuestions) ? normalizedPayload.practiceQuestions : [],
    quiz: Array.isArray(normalizedPayload.quiz) ? normalizedPayload.quiz : [],
    flashcards: Array.isArray(normalizedPayload.flashcards) ? normalizedPayload.flashcards : [],
    revisionNotes: sanitizePlainLearningText(normalizedPayload.revisionNotes),
    cheatSheet: sanitizePlainLearningText(normalizedPayload.cheatSheet),
    mindMap: normalizedPayload.mindMap || '',
    learningRoadmap: Array.isArray(normalizedPayload.learningRoadmap)
      ? normalizedPayload.learningRoadmap
      : typeof normalizedPayload.learningRoadmap === 'string'
        ? normalizedPayload.learningRoadmap.split(/\n|•|- /).map((item) => item.trim()).filter(Boolean).slice(0, 10)
        : []
  };
}

function optimizeTextPayload(text, maxCharacters = 24000) {
  return String(text || '').replace(/\s+/g, ' ').trim().slice(0, maxCharacters);
}

function getCacheKey(prefix, payload) {
  return `${prefix}:${String(payload || '').slice(0, 180)}`;
}

async function readCachedResponse(cacheKey, ttl = 1000 * 60 * 10) {
  const memoryHit = getCachedValue(cacheKey, ttl);
  if (memoryHit) return memoryHit;
  const indexedHit = await getIndexedDBItem('ai-responses', cacheKey);
  if (indexedHit) {
    setCachedValue(cacheKey, indexedHit, ttl);
  }
  return indexedHit;
}

async function writeCachedResponse(cacheKey, value, ttl = 1000 * 60 * 10) {
  setCachedValue(cacheKey, value, ttl);
  await setIndexedDBItem('ai-responses', cacheKey, value);
}

export async function getDakshaResponse(prompt, language = "English") {
  const cacheKey = getCacheKey(`ai-response:${language}`, prompt);
  const cached = await readCachedResponse(cacheKey, 1000 * 60 * 10);
  if (cached) return cached;
  if (!hasAiCredentials()) return getMissingAuthMessage();

  const safePrompt = sanitizePrompt(prompt);
  const safeInput = optimizeTextPayload(safePrompt, 12000);
  const textModels = getConfiguredTextModels();

  if (safeInput.length > 12000) {
    const chunks = splitTextIntoChunks(safeInput, 6000);
    const chunkResults = await Promise.all(chunks.map((chunk) => aiTaskQueue.enqueue(() => callModelWithFallback({
      requestType: 'text',
      messages: [
        { role: 'system', content: `${DAKSHA_SYSTEM_PROMPT} You MUST respond entirely in ${language}.` },
        { role: 'user', content: chunk }
      ],
      models: textModels
    }).then(({ response }) => response))));
    const content = chunkResults.map((item) => item?.choices?.[0]?.message?.content || '').join('\n\n');
    await writeCachedResponse(cacheKey, content, 1000 * 60 * 10);
    return content;
  }

  try {
    const { response } = await withRetry(() => aiTaskQueue.enqueue(() => callModelWithFallback({
      requestType: 'text',
      messages: [
        { role: 'system', content: `${DAKSHA_SYSTEM_PROMPT} You MUST respond entirely in ${language}.` },
        { role: 'user', content: safeInput }
      ],
      models: textModels
    })), { retries: 2, delay: 250 });
    const content = response.choices[0].message.content;
    await writeCachedResponse(cacheKey, content, 1000 * 60 * 10);
    return content;
  } catch (error) {
    return buildStructuredFallbackResponse(prompt, language);
  }
}

export async function getDakshaImageResponse(base64Image, mimeType) {
  const cacheKey = getCacheKey('ai-image', `${mimeType}:${base64Image?.slice(0, 120)}`);
  const cached = getCachedValue(cacheKey, 1000 * 60 * 20);
  if (cached) return cached;
  if (!hasAiCredentials()) return getMissingAuthMessage();

  try {
    const normalizedDataUrl = normalizeImageDataUrl(String(base64Image || '').slice(0, 900000), mimeType || 'image/png');
    if (!normalizedDataUrl) {
      return buildVisionFallbackText('', mimeType);
    }

    const optimizedImage = await compressImageDataUrl(normalizedDataUrl, 0.82, 1400);
    const { response } = await callModelWithFallback({
      requestType: 'vision',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Analyze this image for learning. Return a clear explanation, key concepts, definitions, and practical takeaways from any visible text/diagram.'
            },
            { type: 'image_url', image_url: { url: optimizedImage } }
          ]
        }
      ],
      models: getConfiguredVisionModels()
    });
    const content = toModelTextContent(response?.choices?.[0]?.message?.content);
    setCachedValue(cacheKey, content, 1000 * 60 * 20);
    return content;
  } catch (error) {
    return buildVisionFallbackText(base64Image, mimeType);
  }
}

export async function getDakshaTextResponse(extractedText) {
  const cacheKey = getCacheKey('ai-text', extractedText);
  const cached = getCachedValue(cacheKey, 1000 * 60 * 15);
  if (cached) return cached;
  if (!hasAiCredentials()) return getMissingAuthMessage();

  try {
    const safeText = optimizeTextPayload(sanitizePrompt(extractedText), 18000);
    const { response } = await callModelWithFallback({
      requestType: 'text',
      messages: [
        { role: 'system', content: 'You are Daksha AI. The user has uploaded a document and extracted the text. Read the text, summarize the key knowledge, and explain what the document is about simply.' },
        { role: 'user', content: safeText }
      ],
      models: getConfiguredTextModels()
    });
    const content = response.choices[0].message.content;
    setCachedValue(cacheKey, content, 1000 * 60 * 15);
    return content;
  } catch (error) {
    return buildStructuredFallbackResponse(extractedText, 'English');
  }
}

export async function getDakshaDocumentAnalysis(extractedText, fileName = 'document', fileType = 'unknown') {
  const cacheKey = getCacheKey('ai-document-analysis', `${fileName}:${fileType}:${extractedText?.slice(0, 120)}`);
  const cached = getCachedValue(cacheKey, 1000 * 60 * 20);
  if (cached) return cached;
  if (!hasAiCredentials()) {
    const message = getMissingAuthMessage();
    const fallback = {
      overview: message,
      summary: message,
      topics: [],
      keywords: [],
      definitions: [],
      importantPoints: [],
      difficulty: 'Unknown',
      detectedElements: {
        headings: [],
        chapters: [],
        tables: 0,
        images: 0,
        diagrams: 0,
        formulas: [],
        codeBlocks: [],
        lists: []
      },
      quiz: [],
      flashcards: []
    };
    setCachedValue(cacheKey, fallback, 1000 * 60 * 20);
    return fallback;
  }

  try {
    const limitedText = optimizeTextPayload(sanitizePrompt(extractedText), 18000);
    const prompt = `You are Daksha AI, a professional document understanding engine.
Analyze the text from the uploaded document and detect headings, chapters, tables, images, diagrams, formulas, code blocks, and lists.
Extract the main topics, keywords, definitions, important points, summary, and difficulty level.
Return only valid JSON with the following keys: overview, summary, topics, keywords, definitions, importantPoints, difficulty, detectedElements, quiz, flashcards.

The uploaded file is: ${fileName} (${fileType}).

Text to analyze:
${limitedText}`;

    const { response } = await callModelWithFallback({
      requestType: 'text',
      messages: [
        { role: 'system', content: `${DAKSHA_SYSTEM_PROMPT} You MUST return only valid JSON for document analysis.` },
        { role: 'user', content: prompt }
      ],
      models: getConfiguredTextModels()
    });

    const content = response.choices[0].message.content;
    const parsed = parseJsonResponse(content);
    if (parsed) {
      setCachedValue(cacheKey, parsed, 1000 * 60 * 20);
      return parsed;
    }

    const fallback = {
      overview: content,
      summary: content,
      topics: [],
      keywords: [],
      definitions: [],
      importantPoints: [],
      difficulty: 'Unknown',
      detectedElements: {
        headings: [],
        chapters: [],
        tables: 0,
        images: 0,
        diagrams: 0,
        formulas: [],
        codeBlocks: [],
        lists: []
      },
      quiz: [],
      flashcards: []
    };
    setCachedValue(cacheKey, fallback, 1000 * 60 * 20);
    return fallback;
  } catch (error) {
    const fallback = {
      overview: 'The document analysis is being prepared from the available content.',
      summary: 'The document analysis is being prepared from the available content.',
      topics: [],
      keywords: [],
      definitions: [],
      importantPoints: [],
      difficulty: 'Unknown',
      detectedElements: {
        headings: [],
        chapters: [],
        tables: 0,
        images: 0,
        diagrams: 0,
        formulas: [],
        codeBlocks: [],
        lists: []
      },
      quiz: [],
      flashcards: []
    };
    setCachedValue(cacheKey, fallback, 1000 * 60 * 20);
    return fallback;
  }
}

export async function getDakshaLessonPackage(sourceText, context = 'topic', sourceName = 'topic') {
  const cacheKey = getCacheKey('ai-lesson-package', `${context}:${sourceName}:${sourceText?.slice(0, 120)}`);
  const cached = getCachedValue(cacheKey, 1000 * 60 * 20);
  if (cached) return cached;
  if (!hasAiCredentials()) {
    const message = getMissingAuthMessage();
    return {
      completeCourse: message,
      beginnerExplanation: message,
      intermediateExplanation: '',
      advancedExplanation: '',
      realWorldExamples: [],
      interviewQuestions: [],
      practiceQuestions: [],
      quiz: [],
      flashcards: [],
      revisionNotes: '',
      cheatSheet: '',
      mindMap: '',
      learningRoadmap: ''
    };
  }

  try {
    const limitedSource = optimizeTextPayload(sanitizePrompt(sourceText), 18000);
    const prompt = `You are Daksha AI, a premium lesson generator for learners.
Create a complete course package based on the following source: ${sourceName} (${context}).
Generate the following sections automatically:
- completeCourse
- beginnerExplanation
- intermediateExplanation
- advancedExplanation
- realWorldExamples
- interviewQuestions
- practiceQuestions
- quiz
- flashcards
- revisionNotes
- cheatSheet
- mindMap
- learningRoadmap

Return only valid JSON with these exact keys. Keep each section clear and learner-focused.

Source content:
${limitedSource}`;

    const { response } = await callModelWithFallback({
      requestType: 'text',
      messages: [
        { role: 'system', content: `${DAKSHA_SYSTEM_PROMPT} You MUST return only valid JSON for the lesson package.` },
        { role: 'user', content: prompt }
      ],
      models: getConfiguredTextModels()
    });

    const content = toModelTextContent(response?.choices?.[0]?.message?.content);
    const parsed = parseJsonResponse(content);
    if (parsed) {
      const normalized = normalizeLessonPackagePayload(parsed, sourceName, context);
      setCachedValue(cacheKey, normalized, 1000 * 60 * 20);
      return normalized;
    }

    const repairPrompt = `Convert the following content into strict valid JSON with these exact keys:
completeCourse, beginnerExplanation, intermediateExplanation, advancedExplanation, realWorldExamples, interviewQuestions, practiceQuestions, quiz, flashcards, revisionNotes, cheatSheet, mindMap, learningRoadmap.

Return only JSON and do not include markdown.

Content:
${String(content || '').slice(0, 9000)}`;

    try {
      const { response: repairedResponse } = await callModelWithFallback({
        requestType: 'text',
        task: 'lesson',
        maxTokens: 1200,
        messages: [
          { role: 'system', content: `${DAKSHA_SYSTEM_PROMPT} You MUST return only valid JSON.` },
          { role: 'user', content: repairPrompt }
        ],
        models: getConfiguredTextModels()
      });

      const repairedContent = toModelTextContent(repairedResponse?.choices?.[0]?.message?.content);
      const repairedParsed = parseJsonResponse(repairedContent);
      if (repairedParsed) {
        const normalized = normalizeLessonPackagePayload(repairedParsed, sourceName, context);
        setCachedValue(cacheKey, normalized, 1000 * 60 * 20);
        return normalized;
      }
    } catch {
      // If repair fails, continue to deterministic fallback package.
    }

    const deterministicFallback = normalizeLessonPackagePayload(
      buildLessonFallbackPackage(sourceText, sourceName, context),
      sourceName,
      context
    );
    setCachedValue(cacheKey, deterministicFallback, 1000 * 60 * 20);
    return deterministicFallback;
  } catch (error) {
    console.error("AI Lesson Package Error:", error);
    return normalizeLessonPackagePayload(
      buildLessonFallbackPackage(sourceText, sourceName, context),
      sourceName,
      context
    );
  }
}

export async function generateLessonSuite(topic) {
  if (!hasAiCredentials()) return null;

  try {
    const { response } = await callModelWithFallback({
      requestType: 'text',
      messages: [
        { role: 'system', content: 'You are an expert educational AI. Generate a complete lesson suite for the given topic. Return ONLY a valid JSON object. Do not include markdown formatting or extra text.' },
        { role: 'user', content: `Generate a lesson suite for: "${topic}". 
        Return a JSON object with exactly these keys:
        "course_title" (string), 
        "beginner" (string), "intermediate" (string), "advanced" (string), 
        "examples" (array of strings), "interview_questions" (array of strings), 
        "practice_questions" (array of strings), 
        "quiz" (array of exactly 10 objects with "question" (string), "options" (array of 4 strings), "answer" (string)), 
        "flashcards" (array of objects with "front" (string), "back" (string)),
        "revision_notes" (string), "cheat_sheet" (string), "mind_map" (string), 
        "roadmap" (array of strings).` }
      ],
      models: getConfiguredTextModels()
    });

    let content = toModelTextContent(response?.choices?.[0]?.message?.content);
    content = content.replace(/```json/g, '').replace(/```/g, '').trim();

    const parsed = JSON.parse(content);
    if (!parsed || !parsed.course_title || !parsed.beginner) {
      throw new Error('Missing required keys in AI JSON response');
    }

    return parsed;
  } catch (error) {
    console.error('Lesson Suite Generation/Parse Error:', error);
    return null;
  }
}

export async function generatePptLearningPackage(fileName, pptModel, userId = 'guest') {
  if (!hasAiCredentials()) {
    return {
      title: fileName,
      summary: 'AI is not configured yet. Add OpenRouter settings to generate PPT learning packages.',
      beginnerLesson: 'Start by reviewing your slide titles and notes.',
      intermediateLesson: 'Group slides by concept and map dependencies.',
      advancedLesson: 'Turn slide concepts into practice tasks and case studies.',
      keyConcepts: [],
      importantDefinitions: [],
      examples: [],
      realWorldApplications: [],
      revisionNotes: [],
      cheatSheet: [],
      flashcards: [],
      quiz: [],
      mindMap: 'Core message -> key concepts -> practice',
      learningRoadmap: []
    };
  }

  try {
    const prompt = `You are Daksha AI, a premium presentation-to-course generator.
Create a structured learning package from this PPT content.
Return ONLY valid JSON with these exact keys:
{
  "title": "",
  "summary": "",
  "beginnerLesson": "",
  "intermediateLesson": "",
  "advancedLesson": "",
  "keyConcepts": [],
  "importantDefinitions": [],
  "examples": [],
  "realWorldApplications": [],
  "revisionNotes": [],
  "cheatSheet": [],
  "flashcards": [{"front": "", "back": ""}],
  "quiz": [{"question": "", "options": ["", "", "", ""], "answer": ""}],
  "mindMap": "",
  "learningRoadmap": []
}

Document file name: ${fileName}
User id: ${userId}
Presentation title: ${pptModel?.title || 'Untitled'}
Overview: ${pptModel?.overview || ''}
Slides: ${JSON.stringify(pptModel?.slides || [])}
Charts: ${JSON.stringify(pptModel?.charts || [])}
Images: ${JSON.stringify(pptModel?.images || [])}
Tables: ${JSON.stringify(pptModel?.tables || [])}
Diagrams: ${JSON.stringify(pptModel?.diagrams || [])}
Notes: ${JSON.stringify(pptModel?.notes || [])}`;

    const { response } = await callModelWithFallback({
      requestType: 'text',
      messages: [
        { role: 'system', content: `${DAKSHA_SYSTEM_PROMPT} You MUST return only valid JSON for presentation learning generation.` },
        { role: 'user', content: prompt }
      ],
      models: getConfiguredTextModels()
    });

    const content = toModelTextContent(response?.choices?.[0]?.message?.content);
    const parsed = parseJsonResponse(content);
    if (parsed) {
      return parsed;
    }

    return {
      title: pptModel?.title || fileName,
      summary: 'A structured lesson package was generated from your presentation.',
      beginnerLesson: 'Start by understanding the central message and the first few slides.',
      intermediateLesson: 'Connect the ideas across slides and understand the supporting evidence.',
      advancedLesson: 'Compare the structure, evaluate the arguments, and apply the ideas in context.',
      keyConcepts: [],
      importantDefinitions: [],
      examples: [],
      realWorldApplications: [],
      revisionNotes: [],
      cheatSheet: [],
      flashcards: [],
      quiz: [],
      mindMap: 'Core message → important slides → applications',
      learningRoadmap: []
    };
  } catch (error) {
    console.error('PPT Learning Package Error:', error);
    return {
      title: fileName,
      summary: 'I could not generate the PPT learning package right now.',
      beginnerLesson: 'Start by reading the slides carefully.',
      intermediateLesson: 'Break the deck into sections and relate the ideas.',
      advancedLesson: 'Go deeper into the supporting data and examples.',
      keyConcepts: [],
      importantDefinitions: [],
      examples: [],
      realWorldApplications: [],
      revisionNotes: [],
      cheatSheet: [],
      flashcards: [],
      quiz: [],
      mindMap: 'Core message → important slides → applications',
      learningRoadmap: []
    };
  }
}

export async function generateYouTubeLearningPackage(videoUrl, videoModel, userId = 'guest') {
  try {
    const prompt = `You are Daksha AI, a premium YouTube-to-course generator.
Create a structured learning package from this video content.
Return ONLY valid JSON with these exact keys:
{
  "title": "",
  "summary": "",
  "beginnerLesson": "",
  "intermediateLesson": "",
  "advancedLesson": "",
  "keyConcepts": [],
  "importantDefinitions": [],
  "examples": [],
  "realWorldApplications": [],
  "revisionNotes": [],
  "cheatSheet": [],
  "flashcards": [{"front": "", "back": ""}],
  "quiz": [{"question": "", "options": ["", "", "", ""], "answer": ""}],
  "mindMap": "",
  "learningRoadmap": []
}

Video url: ${videoUrl}
User id: ${userId}
Video title: ${videoModel?.title || 'Untitled'}
Transcript: ${JSON.stringify(videoModel?.transcript || [])}
Chapters: ${JSON.stringify(videoModel?.chapters || [])}
Topics: ${JSON.stringify(videoModel?.topics || [])}
Definitions: ${JSON.stringify(videoModel?.definitions || [])}
Important concepts: ${JSON.stringify(videoModel?.importantConcepts || [])}
Code snippets: ${JSON.stringify(videoModel?.codeSnippets || [])}
Formulas: ${JSON.stringify(videoModel?.formulas || [])}`;

    const { response } = await callModelWithFallback({
      requestType: 'text',
      messages: [
        { role: 'system', content: `${DAKSHA_SYSTEM_PROMPT} You MUST return only valid JSON for YouTube learning generation.` },
        { role: 'user', content: prompt }
      ],
      models: getConfiguredTextModels()
    });

    const content = response.choices[0].message.content;
    const parsed = parseJsonResponse(content);
    if (parsed) {
      return parsed;
    }

    return {
      title: videoModel?.title || 'YouTube lesson',
      summary: 'A structured lesson package was generated from your video.',
      beginnerLesson: 'Start by understanding the main idea and the first part of the video.',
      intermediateLesson: 'Connect the main ideas with examples and supporting details.',
      advancedLesson: 'Compare the concepts, evaluate the applications, and build deeper understanding.',
      keyConcepts: [],
      importantDefinitions: [],
      examples: [],
      realWorldApplications: [],
      revisionNotes: [],
      cheatSheet: [],
      flashcards: [],
      quiz: [],
      mindMap: 'Core idea → examples → applications',
      learningRoadmap: []
    };
  } catch (error) {
    console.error('YouTube Learning Package Error:', error);
    return {
      title: videoModel?.title || 'YouTube lesson',
      summary: 'I could not generate the YouTube learning package right now.',
      beginnerLesson: 'Start by reviewing the transcript carefully.',
      intermediateLesson: 'Break the lesson into smaller sections and connect the ideas.',
      advancedLesson: 'Go deeper into the theory and practice the key concepts.',
      keyConcepts: [],
      importantDefinitions: [],
      examples: [],
      realWorldApplications: [],
      revisionNotes: [],
      cheatSheet: [],
      flashcards: [],
      quiz: [],
      mindMap: 'Core idea → examples → applications',
      learningRoadmap: []
    };
  }
}

export async function generateCameraLearningPackage(extractedText, imageName = 'camera-image', previewUrl = '', userId = 'guest') {
  try {
    const prompt = `You are Daksha AI, a premium camera OCR-to-learning engine.
Create a complete learning package from the extracted OCR text and image context.
Return ONLY valid JSON with these exact keys:
{
  "title": "",
  "ocrText": "",
  "summary": "",
  "beginnerLesson": "",
  "intermediateLesson": "",
  "advancedLesson": "",
  "keyConcepts": [],
  "importantDefinitions": [],
  "examples": [],
  "realWorldApplications": [],
  "revisionNotes": [],
  "cheatSheet": [],
  "flashcards": [{"front": "", "back": ""}],
  "quiz": [{"question": "", "options": ["", "", "", ""], "answer": ""}],
  "mindMap": "",
  "learningRoadmap": [],
  "analysis": {
    "detectedElements": {
      "headings": [],
      "paragraphs": [],
      "tables": [],
      "handwrittenText": [],
      "formulas": [],
      "diagrams": [],
      "codeSnippets": [],
      "concepts": []
    },
    "keyConcepts": [],
    "definitions": [],
    "formulas": [],
    "diagrams": [],
    "qualityWarnings": []
  },
  "lesson": {
    "title": "",
    "summary": "",
    "beginnerLesson": "",
    "intermediateLesson": "",
    "advancedLesson": "",
    "keyConcepts": [],
    "importantDefinitions": [],
    "examples": [],
    "realWorldApplications": [],
    "revisionNotes": [],
    "cheatSheet": [],
    "flashcards": [],
    "quiz": [],
    "mindMap": "",
    "learningRoadmap": []
  }
}

Image name: ${imageName}
User id: ${userId}
Extracted OCR text: ${extractedText}`;

    const { response } = await callModelWithFallback({
      requestType: 'text',
      messages: [
        { role: 'system', content: `${DAKSHA_SYSTEM_PROMPT} You MUST return only valid JSON for camera OCR learning.` },
        { role: 'user', content: prompt }
      ],
      models: getConfiguredTextModels()
    });

    const content = response.choices[0].message.content;
    const parsed = parseJsonResponse(content);
    if (parsed) {
      return parsed;
    }

    return {
      title: imageName || 'OCR learning session',
      ocrText: extractedText,
      summary: 'The OCR text has been converted into a structured learning package.',
      beginnerLesson: 'Begin by understanding the central idea in the image.',
      intermediateLesson: 'Connect the extracted details into a coherent explanation.',
      advancedLesson: 'Deepen the understanding by exploring deeper implications and examples.',
      keyConcepts: [],
      importantDefinitions: [],
      examples: [],
      realWorldApplications: [],
      revisionNotes: [],
      cheatSheet: [],
      flashcards: [],
      quiz: [],
      mindMap: 'Core idea → supporting text → applications',
      learningRoadmap: [],
      analysis: {
        detectedElements: {
          headings: [],
          paragraphs: [],
          tables: [],
          handwrittenText: [],
          formulas: [],
          diagrams: [],
          codeSnippets: [],
          concepts: []
        },
        keyConcepts: [],
        definitions: [],
        formulas: [],
        diagrams: [],
        qualityWarnings: []
      },
      lesson: {
        title: imageName || 'OCR learning session',
        summary: 'The OCR text has been converted into a structured learning package.',
        beginnerLesson: 'Begin by understanding the central idea in the image.',
        intermediateLesson: 'Connect the extracted details into a coherent explanation.',
        advancedLesson: 'Deepen the understanding by exploring deeper implications and examples.',
        keyConcepts: [],
        importantDefinitions: [],
        examples: [],
        realWorldApplications: [],
        revisionNotes: [],
        cheatSheet: [],
        flashcards: [],
        quiz: [],
        mindMap: 'Core idea → supporting text → applications',
        learningRoadmap: []
      }
    };
  } catch (error) {
    console.error('Camera OCR Learning Package Error:', error);
    return {
      title: imageName || 'OCR learning session',
      ocrText: extractedText,
      summary: 'I could not generate the camera OCR lesson package right now.',
      beginnerLesson: 'Review the extracted text carefully.',
      intermediateLesson: 'Group the information into sections.',
      advancedLesson: 'Look for deeper patterns and applications.',
      keyConcepts: [],
      importantDefinitions: [],
      examples: [],
      realWorldApplications: [],
      revisionNotes: [],
      cheatSheet: [],
      flashcards: [],
      quiz: [],
      mindMap: 'Core idea → supporting text → applications',
      learningRoadmap: [],
      analysis: {
        detectedElements: {
          headings: [],
          paragraphs: [],
          tables: [],
          handwrittenText: [],
          formulas: [],
          diagrams: [],
          codeSnippets: [],
          concepts: []
        },
        keyConcepts: [],
        definitions: [],
        formulas: [],
        diagrams: [],
        qualityWarnings: []
      },
      lesson: {
        title: imageName || 'OCR learning session',
        summary: 'I could not generate the camera OCR lesson package right now.',
        beginnerLesson: 'Review the extracted text carefully.',
        intermediateLesson: 'Group the information into sections.',
        advancedLesson: 'Look for deeper patterns and applications.',
        keyConcepts: [],
        importantDefinitions: [],
        examples: [],
        realWorldApplications: [],
        revisionNotes: [],
        cheatSheet: [],
        flashcards: [],
        quiz: [],
        mindMap: 'Core idea → supporting text → applications',
        learningRoadmap: []
      }
    };
  }
}

export async function generateWebsiteLearningPackage(url, websiteModel, userId = 'guest') {
  try {
    const prompt = `You are Daksha AI, a premium website-to-course generator.
Create a structured learning package from this webpage content.
Return ONLY valid JSON with these exact keys:
{
  "title": "",
  "summary": "",
  "beginnerLesson": "",
  "intermediateLesson": "",
  "advancedLesson": "",
  "keyConcepts": [],
  "importantDefinitions": [],
  "examples": [],
  "realWorldApplications": [],
  "revisionNotes": [],
  "cheatSheet": [],
  "flashcards": [{"front": "", "back": ""}],
  "quiz": [{"question": "", "options": ["", "", "", ""], "answer": ""}],
  "mindMap": "",
  "learningRoadmap": []
}

Website url: ${url}
User id: ${userId}
Page title: ${websiteModel?.title || 'Untitled'}
Content: ${websiteModel?.content || ''}
Headings: ${JSON.stringify(websiteModel?.headings || [])}
Subheadings: ${JSON.stringify(websiteModel?.subheadings || [])}
Code blocks: ${JSON.stringify(websiteModel?.codeBlocks || [])}
Tables: ${JSON.stringify(websiteModel?.tables || [])}
Images: ${JSON.stringify(websiteModel?.images || [])}
Formulas: ${JSON.stringify(websiteModel?.formulas || [])}
Concepts: ${JSON.stringify(websiteModel?.concepts || [])}`;

    const { response } = await callModelWithFallback({
      requestType: 'text',
      messages: [
        { role: 'system', content: `${DAKSHA_SYSTEM_PROMPT} You MUST return only valid JSON for website learning generation.` },
        { role: 'user', content: prompt }
      ],
      models: getConfiguredTextModels()
    });

    const content = response.choices[0].message.content;
    const parsed = parseJsonResponse(content);
    if (parsed) {
      return parsed;
    }

    return {
      title: websiteModel?.title || 'Web learning lesson',
      summary: 'A structured lesson package was generated from the webpage.',
      beginnerLesson: 'Start with the main purpose and the most important section of the page.',
      intermediateLesson: 'Connect the headings with the supporting examples and details.',
      advancedLesson: 'Go deeper into the concepts and evaluate how the ideas fit together.',
      keyConcepts: [],
      importantDefinitions: [],
      examples: [],
      realWorldApplications: [],
      revisionNotes: [],
      cheatSheet: [],
      flashcards: [],
      quiz: [],
      mindMap: 'Core topic → supporting sections → applications',
      learningRoadmap: []
    };
  } catch (error) {
    console.error('Website Learning Package Error:', error);
    return {
      title: websiteModel?.title || 'Web learning lesson',
      summary: 'I could not generate the website learning package right now.',
      beginnerLesson: 'Start by reviewing the page carefully.',
      intermediateLesson: 'Break the content into smaller sections.',
      advancedLesson: 'Go deeper into the supporting details and examples.',
      keyConcepts: [],
      importantDefinitions: [],
      examples: [],
      realWorldApplications: [],
      revisionNotes: [],
      cheatSheet: [],
      flashcards: [],
      quiz: [],
      mindMap: 'Core topic → supporting sections → applications',
      learningRoadmap: []
    };
  }
}

export async function generateDocxLearningPackage(fileName, docxModel, userId = 'guest') {
  try {
    const prompt = `You are Daksha AI, a premium document-to-course generator.
Create a structured learning package from this DOCX content.
Return ONLY valid JSON with these exact keys:
{
  "title": "",
  "summary": "",
  "level": "Beginner",
  "objectives": [],
  "outline": {
    "sections": [{"title": ""}],
    "definitions": [{"term": "", "meaning": ""}],
    "tables": [{"title": ""}],
    "concepts": [{"title": ""}],
    "bookmarks": [{"title": ""}]
  },
  "lessons": [{"title": "", "content": ""}],
  "beginnerLesson": "",
  "intermediateLesson": "",
  "advancedLesson": "",
  "keyConcepts": [],
  "importantDefinitions": [],
  "examples": [],
  "realWorldApplications": [],
  "revisionNotes": [],
  "cheatSheet": [],
  "flashcards": [{"front": "", "back": ""}],
  "quiz": [{"question": "", "options": ["", "", "", ""], "answer": ""}],
  "mindMap": "",
  "learningRoadmap": []
}

Document file name: ${fileName}
User id: ${userId}
Document title: ${docxModel?.title || 'Untitled'}
Overview: ${docxModel?.overview || ''}
Sections: ${JSON.stringify(docxModel?.sections || [])}
Subsections: ${JSON.stringify(docxModel?.subSections || [])}
Tables: ${JSON.stringify(docxModel?.tables || [])}
Lists: ${JSON.stringify(docxModel?.lists || [])}
Definitions: ${JSON.stringify(docxModel?.definitions || [])}
Formulas: ${JSON.stringify(docxModel?.formulas || [])}
Highlights: ${JSON.stringify(docxModel?.highlights || [])}
Extracted text: ${docxModel?.extractedText || ''}`;

    const { response } = await callModelWithFallback({
      requestType: 'text',
      messages: [
        { role: 'system', content: `${DAKSHA_SYSTEM_PROMPT} You MUST return only valid JSON for DOCX learning generation.` },
        { role: 'user', content: prompt }
      ],
      models: getConfiguredTextModels()
    });

    const content = response.choices[0].message.content;
    const parsed = parseJsonResponse(content);
    if (parsed) {
      return parsed;
    }

    return {
      title: docxModel?.title || fileName,
      summary: 'A structured learning package was generated from your document.',
      level: 'Beginner',
      objectives: ['Understand the core ideas', 'Learn the most important concepts'],
      outline: {
        sections: [],
        definitions: [],
        tables: [],
        concepts: [],
        bookmarks: []
      },
      lessons: [],
      beginnerLesson: 'Start with the main ideas in the document.',
      intermediateLesson: 'Connect the ideas with examples and practical context.',
      advancedLesson: 'Go deeper into nuance, compare concepts, and evaluate the document.',
      keyConcepts: [],
      importantDefinitions: [],
      examples: [],
      realWorldApplications: [],
      revisionNotes: [],
      cheatSheet: [],
      flashcards: [],
      quiz: [],
      mindMap: 'Core idea → supporting sections → application',
      learningRoadmap: []
    };
  } catch (error) {
    console.error('DOCX Learning Package Error:', error);
    return {
      title: fileName,
      summary: 'I could not generate the DOCX learning package right now.',
      level: 'Beginner',
      objectives: ['Review the document structure', 'Learn the key ideas'],
      outline: {
        sections: [],
        definitions: [],
        tables: [],
        concepts: [],
        bookmarks: []
      },
      lessons: [],
      beginnerLesson: 'Start by reading the document carefully.',
      intermediateLesson: 'Break the document into smaller ideas.',
      advancedLesson: 'Compare the concepts and test your understanding.',
      keyConcepts: [],
      importantDefinitions: [],
      examples: [],
      realWorldApplications: [],
      revisionNotes: [],
      cheatSheet: [],
      flashcards: [],
      quiz: [],
      mindMap: 'Core idea → supporting sections → application',
      learningRoadmap: []
    };
  }
}

export async function generateSkillRoadmap(skill, learningProfile = null) {
  if (!hasAiCredentials()) {
    return {
      skill,
      skillOverview: getMissingAuthMessage(),
      beginnerRoadmap: [`Set up AI credentials to generate a complete ${skill} roadmap.`],
      intermediateRoadmap: [],
      advancedRoadmap: [],
      dailyStudyPlan: [],
      weeklyGoals: [],
      monthlyGoals: [],
      requiredTools: [],
      freeResources: [],
      paidResources: [],
      bestYouTubeChannels: [],
      bestBooks: [],
      bestWebsites: [],
      projects: [],
      portfolioIdeas: [],
      internshipPreparation: [],
      jobPreparation: [],
      freelancingGuide: [],
      businessOpportunities: [],
      futureScope: [],
      salaryInformation: '',
      finalChecklist: []
    };
  }

  const learnerContext = learningProfile
    ? `\nLearner profile:\n${JSON.stringify(learningProfile, null, 2)}\nUse this to personalize depth, language style, pace, examples, and roadmap milestones.`
    : '';

  try {
    const { response } = await callModelWithFallback({
      requestType: 'text',
      messages: [
        { role: 'system', content: `${DAKSHA_SYSTEM_PROMPT} You MUST return only valid JSON for a professional skill roadmap.` },
        { role: 'user', content: `Create a professional skill roadmap for: ${skill}.${learnerContext}\nReturn ONLY valid JSON with this exact structure:
{
  "skill": "${skill}",
  "skillOverview": "<overview>",
  "beginnerRoadmap": ["<step 1>", "<step 2>", "<step 3>"],
  "intermediateRoadmap": ["<step 1>", "<step 2>", "<step 3>"],
  "advancedRoadmap": ["<step 1>", "<step 2>", "<step 3>"],
  "dailyStudyPlan": ["<plan item 1>", "<plan item 2>", "<plan item 3>"],
  "weeklyGoals": ["<goal 1>", "<goal 2>", "<goal 3>"],
  "monthlyGoals": ["<goal 1>", "<goal 2>", "<goal 3>"],
  "requiredTools": ["<tool 1>", "<tool 2>"],
  "freeResources": ["<resource 1>", "<resource 2>"],
  "paidResources": ["<resource 1>", "<resource 2>"],
  "bestYouTubeChannels": ["<channel 1>", "<channel 2>"],
  "bestBooks": ["<book 1>", "<book 2>"],
  "bestWebsites": ["<website 1>", "<website 2>"],
  "projects": ["<project 1>", "<project 2>"],
  "portfolioIdeas": ["<idea 1>", "<idea 2>"],
  "internshipPreparation": ["<prep 1>", "<prep 2>"],
  "jobPreparation": ["<prep 1>", "<prep 2>"],
  "freelancingGuide": ["<step 1>", "<step 2>"],
  "businessOpportunities": ["<opportunity 1>", "<opportunity 2>"],
  "futureScope": ["<scope 1>", "<scope 2>"],
  "salaryInformation": "<salary summary>",
  "finalChecklist": ["<check item 1>", "<check item 2>"]
}` }
      ],
      models: getConfiguredTextModels()
    });

    const content = response.choices[0].message.content;
    const parsed = parseJsonResponse(content);
    if (parsed) {
      return parsed;
    }

    return {
      skill,
      skillOverview: `A practical roadmap for learning ${skill} with strong fundamentals, portfolio projects, and career growth.`,
      beginnerRoadmap: [`Learn the core concepts of ${skill}`],
      intermediateRoadmap: [`Practice real examples of ${skill}`],
      advancedRoadmap: [`Build professional work in ${skill}`],
      dailyStudyPlan: ['Study consistently for 45-60 minutes', 'Practice one small skill each day'],
      weeklyGoals: ['Complete one learning milestone'],
      monthlyGoals: ['Build a portfolio project'],
      requiredTools: ['Laptop', 'Reliable internet'],
      freeResources: ['Official documentation', 'YouTube tutorials'],
      paidResources: ['Premium courses'],
      bestYouTubeChannels: ['Educational channels'],
      bestBooks: ['Foundational books'],
      bestWebsites: ['Official websites'],
      projects: [`Create a project around ${skill}`],
      portfolioIdeas: ['Create a case study'],
      internshipPreparation: ['Prepare a polished resume'],
      jobPreparation: ['Practice interview answers'],
      freelancingGuide: ['Create a simple service offer'],
      businessOpportunities: ['Explore niche opportunities'],
      futureScope: ['Follow industry growth'],
      salaryInformation: 'Salary depends on level, location, and specialization.',
      finalChecklist: ['Practice regularly', 'Build portfolio work']
    };
  } catch (error) {
    console.error('Skill Roadmap Generation Error:', error);
    return null;
  }
}

export async function generateQuizEngine(topic, difficulty = 'Medium', questionCount = 10) {
  try {
    const { response } = await callModelWithFallback({
      requestType: 'text',
      messages: [
        { role: 'system', content: `${DAKSHA_SYSTEM_PROMPT} You MUST return only valid JSON for a professional quiz generator.` },
        { role: 'user', content: `Create a professional quiz about: ${topic}. Use the difficulty level: ${difficulty}. Create exactly ${questionCount} questions. Return ONLY valid JSON with this exact structure:
{
  "title": "<quiz title>",
  "difficulty": "${difficulty}",
  "questions": [
    {
      "question": "<question>",
      "options": ["<option 1>", "<option 2>", "<option 3>", "<option 4>"],
      "answer": "<correct answer>",
      "explanation": "<explanation>",
      "type": "multiple-choice"
    }
  ]
}

Rules:
- Use a mix of question types when appropriate, but keep the output consistent and valid.
- For true/false use options ["True", "False"].
- For fill-in-the-blank, short-answer, or match-the-following, options can be empty arrays.
- Keep the answer and explanation clear and educational.
- Do not include markdown or extra text.` }
      ],
      models: getConfiguredTextModels()
    });

    const content = response.choices[0].message.content;
    const parsed = parseJsonResponse(content);
    if (parsed) {
      return parsed;
    }

    return {
      title: `${topic} Quiz`,
      difficulty,
      questions: [
        {
          question: `What is the main idea of ${topic}?`,
          options: ['A core concept', 'An unrelated idea', 'A random fact', 'A missing answer'],
          answer: 'A core concept',
          explanation: 'This is a basic concept check about the topic.',
          type: 'multiple-choice',
        }
      ],
    };
  } catch (error) {
    console.error('Quiz Generation Error:', error);
    return {
      title: `${topic} Quiz`,
      difficulty,
      questions: [],
    };
  }
}

export async function generateFlashcards(topic, difficulty = 'Mixed') {
  try {
    const { response } = await callModelWithFallback({
      requestType: 'text',
      messages: [
        { role: 'system', content: `${DAKSHA_SYSTEM_PROMPT} You MUST return only valid JSON for a professional flashcard deck.` },
        { role: 'user', content: `Create a professional flashcard deck for: ${topic}. Difficulty: ${difficulty}. Return ONLY valid JSON with this exact structure:
{
  "title": "<deck title>",
  "category": "<category>",
  "flashcards": [
    {
      "front": "<concept/question>",
      "back": "<answer/explanation>",
      "difficulty": "${difficulty}",
      "tags": ["<tag 1>", "<tag 2>"]
    }
  ]
}
Rules:
- Create 8-12 flashcards.
- Make the cards clear, educational, and useful for revision.
- Do not include markdown or extra text.` }
      ],
      models: getConfiguredTextModels()
    });

    const content = response.choices[0].message.content;
    const parsed = parseJsonResponse(content);
    if (parsed) {
      return parsed;
    }

    return {
      title: `${topic} Flashcards`,
      category: 'Study',
      flashcards: [
        {
          front: `What is ${topic}?`,
          back: `A core concept related to ${topic}.`,
          difficulty,
          tags: ['study'],
        },
      ],
    };
  } catch (error) {
    console.error('Flashcard Generation Error:', error);
    return {
      title: `${topic} Flashcards`,
      category: 'Study',
      flashcards: [],
    };
  }
}

export async function getLearningPath(skill) {
  try {
    const { response } = await callModelWithFallback({
      requestType: 'text',
      messages: [
        { role: 'system', content: DAKSHA_SYSTEM_PROMPT },
        { role: 'user', content: `Create a structured learning roadmap for someone who wants to learn ${skill}. Break it down into 5 distinct modules from beginner to advanced. For each module, provide a clear title and a brief 1-2 sentence description of what will be learned. Format the output cleanly in Markdown.` }
      ],
      models: getConfiguredTextModels()
    });
    return response.choices[0].message.content;
  } catch (error) {
    console.error("AI Error:", error);
    return "I am having trouble generating a roadmap right now. Please try again later.";
  }
}

export async function generateTeacherLesson(topic) {
  try {
    const { response } = await callModelWithFallback({
      requestType: 'text',
      messages: [
        { role: 'system', content: `${DAKSHA_SYSTEM_PROMPT} You MUST return only valid JSON for a teacher lesson.` },
        { role: 'user', content: `Create a polished teacher-style lesson for the topic: ${topic}. Return only valid JSON with this exact structure:
{
  "title": "<lesson title>",
  "beginner": "<clear beginner explanation>",
  "intermediate": "<medium-depth explanation>",
  "advanced": "<advanced explanation>",
  "examples": ["<example 1>", "<example 2>", "<example 3>"],
  "important_points": ["<point 1>", "<point 2>", "<point 3>"],
  "common_mistakes": ["<mistake 1>", "<mistake 2>", "<mistake 3>"],
  "summary": "<short summary>",
  "difficulty": "Beginner|Intermediate|Advanced"
}` }
      ],
      models: getConfiguredTextModels()
    });

    const content = response.choices[0].message.content;
    const parsed = parseJsonResponse(content);
    if (parsed) {
      return parsed;
    }

    return {
      title: `${topic} Lesson`,
      beginner: `Start by understanding the core idea behind ${topic}.`,
      intermediate: `Build on that by exploring practical applications of ${topic}.`,
      advanced: `Go deeper by analyzing nuance, trade-offs, and advanced uses of ${topic}.`,
      examples: [`A simple example for ${topic}.`],
      important_points: ['Understand the fundamentals first.'],
      common_mistakes: ['Skipping the basics.'],
      summary: `A strong summary of ${topic} should connect the basics with real-world use.`,
      difficulty: 'Beginner'
    };
  } catch (error) {
    console.error('Teacher Lesson Generation Error:', error);
    return null;
  }
}

export async function get3DPartExplanation(partName) {
  try {
    const { response } = await callModelWithFallback({
      requestType: 'text',
      messages: [
        { role: 'system', content: DAKSHA_SYSTEM_PROMPT },
        { role: 'user', content: `The user is viewing a 3D model of the Solar System and just clicked on: ${partName}. Give a brief, engaging, 2-3 sentence explanation of what ${partName} is.` }
      ],
      models: getConfiguredTextModels()
    });
    return response.choices[0].message.content;
  } catch (error) {
    console.error("AI 3D Error:", error);
    return "I couldn't load the information for this part.";
  }
}
