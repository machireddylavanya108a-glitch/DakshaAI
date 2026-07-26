const MAX_UPLOAD_SIZE = 20 * 1024 * 1024;
const MEMORY_STORAGE = {
  local: new Map(),
  session: new Map()
};

function getStorage(storageType) {
  if (typeof window !== 'undefined') {
    const storage = storageType === 'local' ? window.localStorage : window.sessionStorage;
    if (storage) return storage;
  }

  return {
    getItem(key) {
      return MEMORY_STORAGE[storageType].has(key) ? MEMORY_STORAGE[storageType].get(key) : null;
    },
    setItem(key, value) {
      MEMORY_STORAGE[storageType].set(key, value);
    },
    removeItem(key) {
      MEMORY_STORAGE[storageType].delete(key);
    }
  };
}

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/zip',
  'text/plain',
  'text/csv',
  'text/markdown',
  'text/html',
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/jpg'
]);
const DANGEROUS_EXTENSIONS = new Set(['exe', 'bat', 'cmd', 'scr', 'com', 'js', 'jar', 'app', 'dll', 'msi']);
const FORBIDDEN_PATTERNS = [
  /ignore previous instructions/i,
  /system prompt/i,
  /reveal secrets/i,
  /bypass/i,
  /developer message/i
];

export function sanitizePrompt(input) {
  const base = String(input || '').replace(/\s+/g, ' ').trim();
  const cleaned = FORBIDDEN_PATTERNS.reduce((acc, pattern) => acc.replace(pattern, ''), base).trim();
  return cleaned.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/javascript:/gi, '').trim();
}

export function validateUploadFile(file) {
  if (!file) {
    return { valid: false, reason: 'No file was provided.' };
  }

  const extension = (file.name || '').split('.').pop()?.toLowerCase();
  const allowedExtensions = new Set(['pdf', 'docx', 'pptx', 'txt', 'md', 'csv', 'html', 'png', 'jpg', 'jpeg', 'webp']);

  if (file.size > MAX_UPLOAD_SIZE) {
    return { valid: false, reason: 'File exceeds the maximum size limit of 20 MB.' };
  }

  if (DANGEROUS_EXTENSIONS.has(extension)) {
    return { valid: false, reason: 'Executable or dangerous file types are not allowed.' };
  }

  if (file.type && !ALLOWED_MIME_TYPES.has(file.type) && !allowedExtensions.has(extension)) {
    return { valid: false, reason: 'Unsupported file type.' };
  }

  return { valid: true };
}

export function validateUrl(value) {
  if (typeof value !== 'string') return false;
  try {
    const parsed = new URL(value);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

export function generateNonce(length = 16) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i += 1) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

export function secureStorage(key, value, ttlMinutes = 30) {
  try {
    const storage = getStorage('local');
    if (arguments.length < 2) {
      const raw = storage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (Date.now() > parsed.expiresAt) {
        storage.removeItem(key);
        return null;
      }
      return parsed.value;
    }

    const payload = { value, expiresAt: Date.now() + ttlMinutes * 60 * 1000 };
    storage.setItem(key, JSON.stringify(payload));
    return payload;
  } catch {
    return null;
  }
}

export function secureSession(key, value, ttlMinutes = 60) {
  try {
    const storage = getStorage('session');
    if (arguments.length < 2) {
      const raw = storage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (Date.now() > parsed.expiresAt) {
        storage.removeItem(key);
        return null;
      }
      return parsed.value;
    }

    const payload = { value, expiresAt: Date.now() + ttlMinutes * 60 * 1000 };
    storage.setItem(key, JSON.stringify(payload));
    return payload;
  } catch {
    return null;
  }
}

export function rateLimiter(key, limit = 10, windowMs = 60_000) {
  const now = Date.now();
  const storage = getStorage('session');
  const bucketKey = `rate:${key}`;
  const raw = storage.getItem(bucketKey);
  if (!raw) {
    const payload = { count: 1, resetAt: now + windowMs };
    storage.setItem(bucketKey, JSON.stringify(payload));
    return { allowed: true, remaining: limit - 1 };
  }

  const parsed = JSON.parse(raw);
  if (now > parsed.resetAt) {
    const payload = { count: 1, resetAt: now + windowMs };
    storage.setItem(bucketKey, JSON.stringify(payload));
    return { allowed: true, remaining: limit - 1 };
  }

  if (parsed.count >= limit) {
    return { allowed: false, remaining: 0 };
  }

  const next = { count: parsed.count + 1, resetAt: parsed.resetAt };
  storage.setItem(bucketKey, JSON.stringify(next));
  return { allowed: true, remaining: limit - next.count };
}

export function getSecurityHeaders() {
  return {
    'Content-Security-Policy': "default-src 'self'; img-src 'self' data: https:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; connect-src 'self' https:; font-src 'self' https:; object-src 'none'; base-uri 'self'; frame-ancestors 'none';",
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Permissions-Policy': 'camera=(self), microphone=(self), geolocation=()',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload'
  };
}

export function encryptSensitiveValue(value) {
  if (typeof value !== 'string') return value;
  return btoa(encodeURIComponent(value));
}

export function decryptSensitiveValue(value) {
  if (typeof value !== 'string') return value;
  try {
    return decodeURIComponent(atob(value));
  } catch {
    return value;
  }
}
