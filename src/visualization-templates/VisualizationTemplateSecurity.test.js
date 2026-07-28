import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  normalizeVisualizationTemplate,
  serializeVisualizationTemplate,
  deserializeVisualizationTemplate,
  importVisualizationTemplate,
  deepCloneVisualizationTemplate,
  serializeTemplateInstance,
  deserializeTemplateInstance,
  instantiateVisualizationTemplate
} from './index.js';

test('unsafe URL removal and function removal', () => {
  const template = normalizeVisualizationTemplate({
    templateId: 'tmpl-security-url',
    assetHints: { fallbackRepresentation: 'javascript:alert(1)', externalAssetAllowed: true },
    metadata: { run: () => 'bad' }
  });

  assert.equal(String(template.assetHints.fallbackRepresentation).includes('javascript:'), false);
  assert.equal(template.metadata.run, undefined);
});

test('prototype pollution prevention', () => {
  const input = {
    templateId: 'tmpl-security-proto',
    metadata: { safe: true },
    extensions: { __proto__: { polluted: 'yes' } }
  };

  const normalized = normalizeVisualizationTemplate(input);
  assert.equal(({}).polluted, undefined);
  assert.equal(normalized.metadata.safe, true);
});

test('circular input handling and excessive nesting/array limits', () => {
  const payload = { templateId: 'tmpl-security-circular', slots: [] };
  payload.self = payload;
  payload.deep = { a: { b: { c: { d: { e: { f: { g: { h: { i: { j: { k: { l: { m: true } } } } } } } } } } } } };
  payload.variables = Array.from({ length: 500 }, (_, index) => ({ id: `var-${index + 1}` }));

  const normalized = normalizeVisualizationTemplate(payload, { limits: { maxVariables: 250, maxNestingDepth: 8 } });
  assert.equal(normalized.extensions.unknownProperties.self, '[circular]');
  assert.equal(normalized.variables.length <= 250, true);
});

test('serialization and deserialization are safe JSON only', () => {
  const serialized = serializeVisualizationTemplate({ templateId: 'tmpl-serialize-safe' });
  const parsed = deserializeVisualizationTemplate(serialized);
  assert.equal(typeof serialized, 'string');
  assert.equal(parsed.valid, true);
});

test('invalid serialized template falls back safely', () => {
  const result = importVisualizationTemplate('{bad-json');
  assert.equal(result.status, 'fallback');
  assert.equal(result.template.name, 'adaptive-universal-template');
});

test('safe deep clone returns detached copy', () => {
  const base = normalizeVisualizationTemplate({ templateId: 'tmpl-clone-safe', metadata: { x: 1 } });
  const clone = deepCloneVisualizationTemplate(base);
  clone.metadata.x = 2;
  assert.equal(base.metadata.x, 1);
});

test('template instance serialization and deserialization', () => {
  const instantiated = instantiateVisualizationTemplate({ templateId: 'tmpl-inst-serialize' }, { sceneId: 'scene-inst' });
  const payload = serializeTemplateInstance(instantiated.instance);
  const restored = deserializeTemplateInstance(payload);

  assert.equal(restored.valid, true);
  assert.equal(restored.instance.templateId, instantiated.instance.templateId);
});

test('implementation has no hardcoded subject/domain mapping patterns', () => {
  const dir = path.resolve('src/visualization-templates');
  const files = fs.readdirSync(dir).filter((name) => name.endsWith('.js') && !name.endsWith('.test.js'));
  const forbidden = [
    'if (subject ===',
    'if(subject===',
    'switch (subject',
    'switch(subject',
    'if (domain ===',
    'if(domain===',
    'switch (domain',
    'switch(domain',
    'supportedSubjects',
    'subjectMap',
    'domainMap',
    'topicMap',
    'subjectTemplate',
    'domainTemplate',
    'topicTemplate',
    'biologyTemplate',
    'physicsTemplate',
    'tradingTemplate',
    'codingTemplate'
  ];

  for (const file of files) {
    const source = fs.readFileSync(path.join(dir, file), 'utf8');
    for (const token of forbidden) {
      assert.equal(source.includes(token), false, `${file} contains forbidden token: ${token}`);
    }
  }
});
