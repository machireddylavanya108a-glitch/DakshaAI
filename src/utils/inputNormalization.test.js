import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeInput } from './inputNormalization.js';

test('normalizeInput supports browser File and Blob inputs', async () => {
  const file = new File(['hello'], 'notes.txt', { type: 'text/plain' });
  const fileResult = await normalizeInput(file);
  assert.equal(fileResult.ok, true);
  assert.equal(fileResult.kind, 'file');

  const blobResult = await normalizeInput(new Blob(['hello'], { type: 'text/plain' }));
  assert.equal(blobResult.ok, true);
  assert.equal(blobResult.kind, 'blob');
});

test('normalizeInput supports ArrayBuffer and Uint8Array inputs', async () => {
  const buffer = new TextEncoder().encode('hello world');
  const bufferResult = await normalizeInput(buffer.buffer);
  assert.equal(bufferResult.ok, true);
  assert.equal(bufferResult.kind, 'arraybuffer');

  const uintResult = await normalizeInput(buffer);
  assert.equal(uintResult.ok, true);
  assert.equal(uintResult.kind, 'uint8array');
});

test('normalizeInput supports URLs, text, JSON, and metadata objects', async () => {
  const urlResult = await normalizeInput('https://example.com/test');
  assert.equal(urlResult.ok, true);
  assert.equal(urlResult.kind, 'url');

  const textResult = await normalizeInput('plain text content');
  assert.equal(textResult.ok, true);
  assert.equal(textResult.kind, 'text');

  const jsonResult = await normalizeInput({ title: 'lesson' });
  assert.equal(jsonResult.ok, true);
  assert.equal(jsonResult.kind, 'json');

  const metadataResult = await normalizeInput({ bucket: 'bucket', fullPath: 'lesson.pdf', name: 'lesson.pdf' });
  assert.equal(metadataResult.ok, true);
  assert.equal(metadataResult.kind, 'firebase-metadata');
});

test('normalizeInput supports drag and drop clipboard-style items', async () => {
  const file = new File(['drop'], 'drop.txt', { type: 'text/plain' });
  const item = { kind: 'file', getAsFile: () => file };
  const dragResult = await normalizeInput(item);
  assert.equal(dragResult.ok, true);
  assert.equal(dragResult.kind, 'file');

  const clipboardItem = {
    types: ['text/plain'],
    getType: async () => 'plain text content'
  };
  const clipboardResult = await normalizeInput(clipboardItem);
  assert.equal(clipboardResult.ok, true);
  assert.equal(clipboardResult.kind, 'text');
});

test('normalizeInput returns structured errors for unsupported values', async () => {
  const result = await normalizeInput({ unsupported: true });
  assert.equal(result.ok, false);
  assert.equal(result.kind, 'unsupported');
  assert.equal(result.error?.code, 'unsupported-input-type');
});
