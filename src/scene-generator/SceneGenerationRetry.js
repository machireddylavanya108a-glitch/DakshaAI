import { SceneGenerationError, toSceneGenerationError } from './SceneGenerationError.js';

function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new SceneGenerationError({
        code: 'REQUEST_CANCELLED',
        stage: 'retry-delay',
        message: 'Retry cancelled.',
        safeMessage: 'Scene generation was cancelled.',
        retryable: false
      }));
      return;
    }

    const timer = setTimeout(() => {
      signal?.removeEventListener?.('abort', onAbort);
      resolve();
    }, ms);

    const onAbort = () => {
      clearTimeout(timer);
      reject(new SceneGenerationError({
        code: 'REQUEST_CANCELLED',
        stage: 'retry-delay',
        message: 'Retry cancelled.',
        safeMessage: 'Scene generation was cancelled.',
        retryable: false
      }));
    };

    signal?.addEventListener?.('abort', onAbort, { once: true });
  });
}

export function isRetryableSceneError(error) {
  const normalized = toSceneGenerationError(error);
  if (normalized.code === 'REQUEST_CANCELLED') return false;
  if (normalized.code === 'PROVIDER_AUTH_FAILED') return false;
  if (normalized.code === 'PROVIDER_CREDITS_UNAVAILABLE') return false;
  if (normalized.code === 'INVALID_PROVIDER_RESPONSE') return false;

  if (normalized.retryable) return true;
  const status = normalized.statusCode;
  return status === 408 || status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}

export async function runWithSceneRetries(task, options = {}, diagnostics = null) {
  const maxRetries = Math.max(0, Math.min(3, Number(options.maxRetries || 0)));
  const baseDelay = Math.max(80, Number(options.baseDelayMs || 240));
  const signal = options.signal;

  let attempt = 0;
  let lastError;

  while (attempt <= maxRetries) {
    try {
      const result = await task(attempt);
      if (diagnostics) {
        diagnostics.attemptCount = attempt + 1;
        diagnostics.retryCount = attempt;
      }
      return result;
    } catch (error) {
      const normalized = toSceneGenerationError(error);
      lastError = normalized;

      if (attempt >= maxRetries || !isRetryableSceneError(normalized)) {
        if (diagnostics) {
          diagnostics.attemptCount = attempt + 1;
          diagnostics.retryCount = attempt;
        }
        throw normalized;
      }

      const jitter = Math.round(Math.random() * 120);
      const delay = Math.min(2500, baseDelay * (2 ** attempt) + jitter);
      await sleep(delay, signal);
      attempt += 1;
    }
  }

  throw lastError || new SceneGenerationError({
    code: 'UNKNOWN_GENERATION_FAILURE',
    stage: 'retry',
    message: 'Retry exhausted.',
    safeMessage: 'Scene generation failed after retries.'
  });
}
