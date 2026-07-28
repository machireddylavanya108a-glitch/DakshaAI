export function splitTextIntoChunks(text, maxChunkSize = 4000) {
  const normalized = String(text || '').trim();
  if (!normalized) return [];
  if (normalized.length <= maxChunkSize) return [normalized];

  const chunks = [];
  let index = 0;
  while (index < normalized.length) {
    const next = normalized.slice(index, index + maxChunkSize);
    const breakIndex = next.lastIndexOf('.');
    const safeChunk = breakIndex > 0 ? next.slice(0, breakIndex + 1) : next;
    chunks.push(safeChunk.trim());
    index += safeChunk.length;
  }
  return chunks.filter(Boolean);
}

export class TaskQueue {
  constructor({ concurrency = 1, retries = 2, retryDelay = 100 } = {}) {
    this.concurrency = concurrency;
    this.retries = retries;
    this.retryDelay = retryDelay;
    this.queue = [];
    this.running = 0;
  }

  enqueue(task) {
    return new Promise((resolve, reject) => {
      this.queue.push({ task, resolve, reject });
      this.process();
    });
  }

  async process() {
    if (this.running >= this.concurrency) return;
    const next = this.queue.shift();
    if (!next) return;

    this.running += 1;
    try {
      let attempt = 0;
      let lastError;
      while (attempt <= this.retries) {
        try {
          const result = await next.task();
          next.resolve(result);
          break;
        } catch (error) {
          lastError = error;
          attempt += 1;
          if (attempt > this.retries) break;
          await new Promise((resolve) => setTimeout(resolve, this.retryDelay));
        }
      }
      if (attempt > this.retries && lastError) {
        next.reject(lastError);
      }
    } finally {
      this.running -= 1;
      this.process();
    }
  }
}

export function createPerformanceMonitor() {
  if (typeof window === 'undefined') {
    return { mark: () => {}, measure: () => {}, trackError: () => {}, trackEvent: () => {} };
  }

  const entries = [];
  return {
    mark(name, value = performance.now()) {
      entries.push({ name, value });
      if (window.__DAKSHA_PERFORMANCE__) {
        window.__DAKSHA_PERFORMANCE__.push({ name, value, ts: Date.now() });
      }
    },
    measure(name, startName) {
      const start = entries.find((entry) => entry.name === startName)?.value || performance.now();
      const duration = performance.now() - start;
      this.mark(name, duration);
      return duration;
    },
    trackError(error, context = 'app') {
      console.error(`[daksha:${context}]`, error);
      if (window.__DAKSHA_PERFORMANCE__) {
        window.__DAKSHA_PERFORMANCE__.push({ name: 'error', context, message: error?.message || String(error), ts: Date.now() });
      }
    },
    trackEvent(eventName, payload = {}) {
      const entry = { name: eventName, payload, ts: Date.now() };
      if (window.__DAKSHA_PERFORMANCE__) {
        window.__DAKSHA_PERFORMANCE__.push(entry);
      }
      if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        navigator.sendBeacon('/analytics', JSON.stringify(entry));
      }
    }
  };
}

export function prefetchAsset(url) {
  if (typeof window === 'undefined' || !url) return Promise.resolve(null);
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = url.match(/\.css$/i) ? 'style' : 'fetch';
  link.href = url;
  document.head.appendChild(link);
  return Promise.resolve(link);
}

export function withRetry(fn, { retries = 2, delay = 250 } = {}) {
  return async (...args) => {
    let lastError;
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      try {
        return await fn(...args);
      } catch (error) {
        lastError = error;
        if (attempt === retries) break;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    throw lastError;
  };
}

export function optimizeImageUrl(url, width = 1200) {
  if (!url || typeof url !== 'string') return url;
  if (url.startsWith('http') && !url.includes('images.unsplash.com')) {
    return url;
  }
  return `${url}${url.includes('?') ? '&' : '?'}w=${width}`;
}

export function registerCrashReporter() {
  if (typeof window === 'undefined') return;
  window.addEventListener('error', (event) => {
    console.error('Unhandled window error:', event.error || event.message);
  });
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
  });
}

export function preloadCriticalAssets() {
  if (typeof window === 'undefined') return;
  const assets = ['/favicon.svg', '/manifest.webmanifest'];
  assets.forEach((asset) => prefetchAsset(asset));
}

export function installProductionOptimizations() {
  if (typeof window === 'undefined') return;
  registerCrashReporter();
  preloadCriticalAssets();
  if (!window.__DAKSHA_PERFORMANCE__) {
    window.__DAKSHA_PERFORMANCE__ = [];
  }
  const monitor = createPerformanceMonitor();
  monitor.mark('app-start');
  window.addEventListener('load', () => {
    monitor.measure('app-loaded', 'app-start');
    monitor.trackEvent('app-loaded');
  });
}
