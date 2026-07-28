function isBrowserFile(value) {
  return typeof File !== 'undefined' && value instanceof File;
}

function isBrowserBlob(value) {
  return typeof Blob !== 'undefined' && value instanceof Blob;
}

function isArrayBuffer(value) {
  return value instanceof ArrayBuffer;
}

function isUint8Array(value) {
  return value instanceof Uint8Array;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date);
}

function isFirebaseMetadata(value) {
  return isPlainObject(value) && (
    Boolean(value.fullPath || value.name || value.bucket || value.downloadTokens || value.contentType || value.size)
  );
}

function isClipboardItem(value) {
  return isPlainObject(value) && Array.isArray(value.types) && typeof value.getType === 'function';
}

function isDragItem(value) {
  return isPlainObject(value) && typeof value.kind === 'string' && typeof value.getAsFile === 'function';
}

function isUrlLike(value) {
  return typeof value === 'string' && /^(https?:\/\/|mailto:|tel:)/i.test(value.trim());
}

function isTextLike(value) {
  return typeof value === 'string';
}

function isJsonLike(value) {
  if (Array.isArray(value)) return true;
  if (!isPlainObject(value)) return false;

  const contentKeys = ['text', 'content', 'body', 'data', 'value', 'items', 'messages', 'payload', 'source', 'title', 'description', 'summary', 'notes', 'question', 'answer', 'url', 'name', 'type', 'mimeType'];
  return Object.keys(value).some((key) => contentKeys.includes(key));
}

function toArrayBuffer(source) {
  if (isArrayBuffer(source)) return source;
  if (isUint8Array(source)) return source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength);
  if (source && typeof source.arrayBuffer === 'function') return source.arrayBuffer();
  return null;
}

export async function normalizeInput(source) {
  if (isBrowserFile(source)) {
    return { ok: true, kind: 'file', value: source, arrayBuffer: () => source.arrayBuffer(), name: source.name, type: source.type };
  }

  if (isBrowserBlob(source)) {
    return { ok: true, kind: 'blob', value: source, arrayBuffer: () => source.arrayBuffer(), type: source.type };
  }

  if (isArrayBuffer(source)) {
    return { ok: true, kind: 'arraybuffer', value: source, arrayBuffer: () => Promise.resolve(source) };
  }

  if (isUint8Array(source)) {
    return { ok: true, kind: 'uint8array', value: source, arrayBuffer: () => Promise.resolve(source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength)) };
  }

  if (isClipboardItem(source)) {
    try {
      const text = await source.getType?.('text/plain');
      if (typeof text === 'string' && text.trim()) {
        return { ok: true, kind: 'text', value: text };
      }
    } catch {
      // ignore and fall through
    }
  }

  if (isDragItem(source)) {
    const file = source.getAsFile();
    if (file) {
      return normalizeInput(file);
    }
  }

  if (isFirebaseMetadata(source)) {
    return { ok: true, kind: 'firebase-metadata', value: source, name: source.name || source.fullPath || 'firebase-source' };
  }

  if (isUrlLike(source)) {
    return { ok: true, kind: 'url', value: source };
  }

  if (isTextLike(source)) {
    return { ok: true, kind: 'text', value: source };
  }

  if (isJsonLike(source)) {
    return { ok: true, kind: 'json', value: source };
  }

  const buffer = await toArrayBuffer(source);
  if (buffer) {
    return { ok: true, kind: 'arraybuffer', value: buffer, arrayBuffer: () => Promise.resolve(buffer) };
  }

  return {
    ok: false,
    kind: 'unsupported',
    error: {
      code: 'unsupported-input-type',
      message: 'The provided source could not be processed by the scanner.'
    }
  };
}
