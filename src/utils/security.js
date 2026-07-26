const MAX_UPLOAD_SIZE = 20 * 1024 * 1024;
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

const FORBIDDEN_PATTERNS = [
  /ignore previous instructions/i,
  /system prompt/i,
  /reveal secrets/i,
  /bypass/i,
  /developer message/i
];

export function sanitizePrompt(input) {
  const base = String(input || '').replace(/\s+/g, ' ').trim();
  return FORBIDDEN_PATTERNS.reduce((acc, pattern) => acc.replace(pattern, ''), base).trim();
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

  if (file.type && !ALLOWED_MIME_TYPES.has(file.type) && !allowedExtensions.has(extension)) {
    return { valid: false, reason: 'Unsupported file type.' };
  }

  return { valid: true };
}

export function getSecurityHeaders() {
  return {
    'Content-Security-Policy': "default-src 'self'; img-src 'self' data: https:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; connect-src 'self' https:; font-src 'self' https:; object-src 'none'; base-uri 'self'; frame-ancestors 'none';",
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Permissions-Policy': 'camera=(self), microphone=(self), geolocation=()'
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
