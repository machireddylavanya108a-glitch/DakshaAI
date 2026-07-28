import { processSceneJsonPipeline } from './SceneVersionManager.js';
import { SceneGenerationError } from './SceneGenerationError.js';

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function safeParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function stripCodeFences(value = '') {
  return String(value || '')
    .replace(/```json/gi, '```')
    .replace(/```/g, '')
    .trim();
}

function normalizeSmartQuotes(value = '') {
  return String(value || '')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"');
}

function removeTrailingCommas(value = '') {
  return String(value || '').replace(/,\s*([}\]])/g, '$1');
}

function extractBalancedJsonCandidates(text = '') {
  const content = String(text || '');
  const candidates = [];
  for (let start = 0; start < content.length; start += 1) {
    if (content[start] !== '{' && content[start] !== '[') continue;

    const opener = content[start];
    const closer = opener === '{' ? '}' : ']';
    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let index = start; index < content.length; index += 1) {
      const char = content[index];

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

      if (char === opener) depth += 1;
      if (char === closer) {
        depth -= 1;
        if (depth === 0) {
          candidates.push(content.slice(start, index + 1));
          start = index;
          break;
        }
      }
    }
  }

  return candidates;
}

function decodeDoubleEncoded(value) {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  const parsed = safeParse(trimmed);
  if (typeof parsed === 'string') {
    return safeParse(parsed) || parsed;
  }
  return parsed || value;
}

function extractProviderText(response = {}) {
  if (isObject(response.structured)) return [response.structured];
  if (isObject(response.data)) return [response.data];

  const textCandidates = [];
  const directText = response?.text;
  if (typeof directText === 'string' && directText.trim()) textCandidates.push(directText);

  const openAiText = response?.raw?.choices?.[0]?.message?.content;
  if (typeof openAiText === 'string' && openAiText.trim()) textCandidates.push(openAiText);

  if (Array.isArray(openAiText)) {
    const merged = openAiText.map((part) => part?.text || '').join(' ').trim();
    if (merged) textCandidates.push(merged);
  }

  return textCandidates;
}

function scoreSceneCandidate(candidate) {
  const obj = Array.isArray(candidate) ? { rootArray: candidate } : candidate;
  if (!isObject(obj)) return 0;

  let score = 0;
  if (obj.version) score += 1.1;
  if (obj.sceneId) score += 1.2;
  if (obj.classification && isObject(obj.classification)) score += 1.8;
  if (obj.environment && isObject(obj.environment)) score += 1.2;
  if (obj.camera && isObject(obj.camera)) score += 1.1;
  if (Array.isArray(obj.timeline)) score += Math.min(1.5, obj.timeline.length * 0.15);
  if (Array.isArray(obj.objects)) score += Math.min(1.8, obj.objects.length * 0.12);
  if (isObject(obj.metadata)) score += 0.9;

  const timelineQuality = Array.isArray(obj.timeline)
    ? obj.timeline.filter((step) => isObject(step) && (step.title || step.description || step.objects)).length
    : 0;
  score += Math.min(1.5, timelineQuality * 0.2);

  const referenceSignals = Array.isArray(obj.objects)
    ? obj.objects.reduce((count, item) => count + (Array.isArray(item?.animationIds) ? 1 : 0), 0)
    : 0;
  score += Math.min(1.2, referenceSignals * 0.12);

  return Number(score.toFixed(3));
}

function parseTextCandidates(textCandidates = []) {
  const parsedCandidates = [];

  textCandidates.forEach((entry) => {
    if (isObject(entry)) {
      parsedCandidates.push(entry);
      return;
    }

    const normalized = removeTrailingCommas(normalizeSmartQuotes(stripCodeFences(String(entry || ''))));
    const direct = safeParse(normalized);
    if (direct) {
      parsedCandidates.push(decodeDoubleEncoded(direct));
      return;
    }

    const boundaries = extractBalancedJsonCandidates(normalized);
    boundaries.forEach((candidate) => {
      const parsed = safeParse(candidate) || safeParse(removeTrailingCommas(candidate));
      if (parsed) parsedCandidates.push(decodeDoubleEncoded(parsed));
    });
  });

  return parsedCandidates
    .map((item) => (typeof item === 'string' ? safeParse(item) : item))
    .filter((item) => isObject(item) || Array.isArray(item));
}

function sanitizeValue(value) {
  if (Array.isArray(value)) return value.map((item) => sanitizeValue(item));
  if (!isObject(value)) {
    if (typeof value === 'string') {
      const cleaned = value
        .replace(/javascript:/gi, '')
        .replace(/data:text\/html/gi, '')
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .trim();
      return cleaned;
    }
    return value;
  }

  const output = Object.create(null);
  Object.entries(value).forEach(([key, nested]) => {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') return;
    output[key] = sanitizeValue(nested);
  });
  return output;
}

export function parseSceneResponse(response, options = {}) {
  const textCandidates = extractProviderText(response);
  const candidates = parseTextCandidates(textCandidates);

  if (!candidates.length) {
    throw new SceneGenerationError({
      code: 'JSON_EXTRACTION_FAILED',
      stage: 'response-parse',
      retryable: true,
      message: 'No valid JSON scene candidates were extracted from provider response.',
      safeMessage: 'Scene response could not be parsed safely.'
    });
  }

  const ranked = candidates
    .map((candidate) => ({
      candidate: sanitizeValue(candidate),
      score: scoreSceneCandidate(candidate)
    }))
    .sort((a, b) => b.score - a.score);

  const selected = ranked[0];
  const normalizedScene = processSceneJsonPipeline(selected.candidate, {
    sourceType: options.sourceType || 'ai-scene',
    fallbackTitle: options.fallbackTitle || 'AI Scene',
    fallbackSubject: options.fallbackSubject || 'General Learning'
  });

  return {
    scene: normalizedScene,
    candidateCount: ranked.length,
    selectedCandidateScore: selected.score
  };
}
