import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const workspaceRoot = process.cwd();

async function listFilesRecursively(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFilesRecursively(fullPath)));
      continue;
    }
    files.push(fullPath);
  }

  return files;
}

async function readText(filePath) {
  return fs.readFile(filePath, 'utf8');
}

test('aiService does not hardcode deepseek model ids', async () => {
  const filePath = path.join(workspaceRoot, 'src', 'services', 'aiService.js');
  const content = await readText(filePath);
  assert.equal(/deepseek\/deepseek-v3:free/i.test(content), false);
});

test('source does not contain forbidden external HDR or Drei preset references', async () => {
  const srcDir = path.join(workspaceRoot, 'src');
  const files = await listFilesRecursively(srcDir);
  const jsLikeFiles = files.filter((item) => /\.(js|jsx|ts|tsx|json)$/i.test(item));

  const forbidden = [
    { pattern: /https?:\/\/[^\s'"`]*(raw\.githack\.com|drei-assets)/i, label: 'external HDR/CDN URL' },
    { pattern: /<Environment\s+preset=/i, label: 'Drei Environment preset' }
  ];

  const matches = [];

  for (const filePath of jsLikeFiles) {
    const content = await readText(filePath);
    for (const rule of forbidden) {
      if (rule.pattern.test(content)) {
        matches.push({ filePath: path.relative(workspaceRoot, filePath), label: rule.label });
      }
    }
  }

  assert.deepEqual(matches, []);
});

test('build output does not include forbidden HDR/CDN references when dist exists', async () => {
  if (process.env.DAKSHA_SCAN_DIST !== '1') {
    return;
  }

  const distDir = path.join(workspaceRoot, 'dist');
  let stats;
  try {
    stats = await fs.stat(distDir);
  } catch {
    stats = null;
  }

  if (!stats || !stats.isDirectory()) {
    return;
  }

  const files = await listFilesRecursively(distDir);
  const textFiles = files.filter((item) => /\.(js|css|html|json|map)$/i.test(item));
  const forbiddenPattern = /https?:\/\/[^\s'"`]*(raw\.githack\.com|drei-assets)/i;

  const offenders = [];
  for (const filePath of textFiles) {
    const content = await readText(filePath);
    if (forbiddenPattern.test(content)) {
      offenders.push(path.relative(workspaceRoot, filePath));
    }
  }

  assert.deepEqual(offenders, []);
});
