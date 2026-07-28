const pendingGenerations = new Map();

function createAbortError() {
  const error = new Error('Educational object generation cancelled.');
  error.name = 'AbortError';
  error.code = 'REQUEST_CANCELLED';
  return error;
}

function buildAbortPromise(signal) {
  if (!signal) return null;
  if (signal.aborted) return Promise.reject(createAbortError());

  return new Promise((_, reject) => {
    signal.addEventListener('abort', () => reject(createAbortError()), { once: true });
  });
}

export function createEducationalObjectGenerationGuardKey(parts = {}) {
  const normalized = {
    sceneId: String(parts.sceneId || ''),
    lessonId: String(parts.lessonId || ''),
    fingerprint: String(parts.fingerprint || ''),
    performanceProfile: String(parts.performanceProfile || ''),
    schemaVersion: String(parts.schemaVersion || ''),
    generatorVersion: String(parts.generatorVersion || ''),
    deterministicSeed: String(parts.deterministicSeed || '')
  };
  return JSON.stringify(normalized);
}

export function hasPendingEducationalObjectGeneration(guardKey) {
  return pendingGenerations.has(String(guardKey || ''));
}

export function clearPendingEducationalObjectGeneration(guardKey) {
  pendingGenerations.delete(String(guardKey || ''));
}

export function runGuardedEducationalObjectGeneration(guardKey, signal, factory) {
  const key = String(guardKey || '');
  const existing = pendingGenerations.get(key);

  if (existing) {
    const abortPromise = buildAbortPromise(signal);
    return abortPromise ? Promise.race([existing, abortPromise]) : existing;
  }

  const task = Promise.resolve()
    .then(() => factory())
    .finally(() => {
      pendingGenerations.delete(key);
    });

  pendingGenerations.set(key, task);

  const abortPromise = buildAbortPromise(signal);
  return abortPromise ? Promise.race([task, abortPromise]) : task;
}
