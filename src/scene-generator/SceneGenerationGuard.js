const pendingRequests = new Map();

function buildAbortPromise(signal) {
  if (!signal) return null;
  if (signal.aborted) {
    return Promise.reject(Object.assign(new Error('Aborted'), { name: 'AbortError' }));
  }

  return new Promise((_, reject) => {
    signal.addEventListener('abort', () => {
      reject(Object.assign(new Error('Aborted'), { name: 'AbortError' }));
    }, { once: true });
  });
}

export function createGenerationGuardKey(parts = {}) {
  const normalized = {
    lessonId: parts.lessonId || '',
    topic: String(parts.topic || '').toLowerCase().trim(),
    fingerprint: String(parts.fingerprint || '').trim(),
    difficulty: String(parts.difficulty || '').toLowerCase().trim(),
    classification: String(parts.classification || '').trim(),
    schemaVersion: String(parts.schemaVersion || '').trim(),
    model: String(parts.model || '').trim(),
    locale: String(parts.locale || '').trim()
  };
  return JSON.stringify(normalized);
}

export function hasPendingGeneration(key) {
  return pendingRequests.has(key);
}

export function clearPendingGeneration(key) {
  pendingRequests.delete(key);
}

export function runGuardedGeneration(key, signal, factory) {
  const existing = pendingRequests.get(key);
  if (existing) {
    const abortPromise = buildAbortPromise(signal);
    return abortPromise ? Promise.race([existing, abortPromise]) : existing;
  }

  const promise = Promise.resolve()
    .then(() => factory())
    .finally(() => {
      pendingRequests.delete(key);
    });

  pendingRequests.set(key, promise);

  const abortPromise = buildAbortPromise(signal);
  return abortPromise ? Promise.race([promise, abortPromise]) : promise;
}
