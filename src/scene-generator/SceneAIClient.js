import { getConfiguredTextModels } from '../config/aiModels.js';
import { requestStructuredAiContent, hasConfiguredAiProvider } from '../services/aiService.js';
import { SceneGenerationError } from './SceneGenerationError.js';
import {
  DEFAULT_SCENE_MAX_TOKENS,
  DEFAULT_SCENE_TIMEOUT_MS,
  MAX_SCENE_MAX_TOKENS
} from './SceneGenerationConfig.js';

function clampMaxTokens(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return DEFAULT_SCENE_MAX_TOKENS;
  return Math.max(600, Math.min(MAX_SCENE_MAX_TOKENS, Math.round(numeric)));
}

function parseStatusCode(error) {
  const code = Number(error?.statusCode || error?.status || error?.response?.status || error?.code);
  return Number.isFinite(code) ? code : null;
}

function mapProviderError(error, providerId = 'openrouter') {
  const statusCode = parseStatusCode(error);
  const message = String(error?.message || 'Provider request failed.');
  const lowered = message.toLowerCase();

  if (error?.name === 'AbortError') {
    return new SceneGenerationError({
      code: 'REQUEST_CANCELLED',
      stage: 'provider-request',
      retryable: false,
      provider: providerId,
      statusCode,
      message,
      safeMessage: 'Scene generation was cancelled.',
      cause: error
    });
  }

  if (statusCode === 402 || lowered.includes('insufficient credits') || lowered.includes('requires more credits')) {
    return new SceneGenerationError({
      code: 'PROVIDER_CREDITS_UNAVAILABLE',
      stage: 'provider-request',
      retryable: false,
      provider: providerId,
      statusCode: 402,
      message,
      safeMessage: 'AI scene generation was unavailable, so an adaptive local scene was created.',
      cause: error
    });
  }

  if (statusCode === 401 || statusCode === 403) {
    return new SceneGenerationError({
      code: 'PROVIDER_AUTH_FAILED',
      stage: 'provider-request',
      retryable: false,
      provider: providerId,
      statusCode,
      message,
      safeMessage: 'AI provider authentication failed. A local fallback scene will be used.',
      cause: error
    });
  }

  if (statusCode === 429) {
    return new SceneGenerationError({
      code: 'RATE_LIMITED',
      stage: 'provider-request',
      retryable: true,
      provider: providerId,
      statusCode,
      message,
      safeMessage: 'AI provider is rate-limited right now. Retrying safely.',
      cause: error
    });
  }

  if ([500, 502, 503, 504].includes(statusCode)) {
    return new SceneGenerationError({
      code: 'PROVIDER_UNAVAILABLE',
      stage: 'provider-request',
      retryable: true,
      provider: providerId,
      statusCode,
      message,
      safeMessage: 'AI provider is temporarily unavailable. Retrying safely.',
      cause: error
    });
  }

  if (statusCode === 408 || lowered.includes('timed out')) {
    return new SceneGenerationError({
      code: 'REQUEST_TIMEOUT',
      stage: 'provider-request',
      retryable: true,
      provider: providerId,
      statusCode: statusCode || 408,
      message,
      safeMessage: 'AI request timed out. Retrying safely.',
      cause: error
    });
  }

  return new SceneGenerationError({
    code: 'UNKNOWN_GENERATION_FAILURE',
    stage: 'provider-request',
    retryable: false,
    provider: providerId,
    statusCode,
    message,
    safeMessage: 'AI provider request failed. A local fallback scene will be used.',
    cause: error
  });
}

function resolveProviderAdapter(provider) {
  if (provider && typeof provider === 'object' && typeof provider.generateStructuredScene === 'function') {
    return provider;
  }

  return {
    id: 'openrouter',
    supportsJsonMode: true,
    supportsAbort: true,
    metadata: {
      safe: true,
      source: 'aiService'
    },
    async generateStructuredScene({ messages, model, maxTokens, timeoutMs, signal }) {
      if (!hasConfiguredAiProvider()) {
        throw new SceneGenerationError({
          code: 'PROVIDER_UNAVAILABLE',
          stage: 'provider-request',
          retryable: false,
          provider: 'openrouter',
          statusCode: 503,
          message: 'Provider is not configured.',
          safeMessage: 'AI provider is not configured. A local fallback scene will be used.'
        });
      }

      const models = model ? [model] : getConfiguredTextModels();
      return requestStructuredAiContent({
        messages,
        models,
        maxTokens: clampMaxTokens(maxTokens),
        timeoutMs,
        signal,
        requestType: 'text'
      });
    }
  };
}

export async function requestScenePlanFromProvider(payload = {}, options = {}) {
  const adapter = resolveProviderAdapter(options.provider);
  const timeoutMs = Math.max(100, Number(options.timeoutMs || DEFAULT_SCENE_TIMEOUT_MS));
  const localController = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const providerSignal = localController?.signal || options.signal;

  if (localController && options.signal) {
    const onAbort = () => localController.abort();
    options.signal.addEventListener('abort', onAbort, { once: true });
  }

  try {
    const responsePromise = adapter.generateStructuredScene({
      messages: payload.messages || [],
      model: options.model,
      maxTokens: clampMaxTokens(options.maxOutputTokens),
      timeoutMs,
      signal: providerSignal
    });

    const timeoutPromise = new Promise((_, reject) => {
      const timer = setTimeout(() => {
        if (localController) localController.abort();
        reject(new SceneGenerationError({
          code: 'REQUEST_TIMEOUT',
          stage: 'provider-request',
          retryable: true,
          provider: adapter.id,
          statusCode: 408,
          message: 'Provider request timed out.',
          safeMessage: 'AI request timed out. Retrying safely.'
        }));
      }, timeoutMs);

      responsePromise
        .finally(() => clearTimeout(timer))
        .catch(() => {});
    });

    const response = await Promise.race([responsePromise, timeoutPromise]);

    return {
      provider: adapter.id,
      model: response?.model || options.model || null,
      text: String(response?.text || ''),
      raw: response?.raw || null,
      structured: response?.structured || null,
      metadata: {
        ...(adapter.metadata || {}),
        ...(response?.metadata || {}),
        supportsAbort: Boolean(adapter.supportsAbort),
        supportsJsonMode: Boolean(adapter.supportsJsonMode)
      }
    };
  } catch (error) {
    throw mapProviderError(error, adapter.id);
  }
}
