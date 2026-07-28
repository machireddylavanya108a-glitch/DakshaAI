import test from 'node:test';
import assert from 'node:assert/strict';
import { generateUniversalScene } from './SceneGenerationPipeline.js';
import { parseSceneResponse } from './SceneResponseParser.js';
import { sceneGenerationCache } from './SceneGenerationCache.js';

function buildSceneCandidate(overrides = {}) {
  return {
    version: 'v2',
    sceneId: 'scene-test-1',
    title: 'Adaptive Scene',
    subject: 'Open Topic',
    classification: {
      domain: 'Custom',
      subDomain: 'Open Topic',
      visualization: 'Adaptive',
      sceneComplexity: 'medium',
      objectCategory: 'Dynamic',
      animationCategory: 'Guided Motion',
      interactionCategory: 'Exploration',
      interaction: 'Exploration',
      confidence: 0.82,
      metadata: {}
    },
    environment: { preset: 'classroom' },
    camera: { position: [0, 1.8, 5], rotation: [0, 0, 0], target: [0, 1, 0] },
    timeline: [
      {
        id: 'step-1',
        order: 0,
        title: 'Explore Concept',
        description: 'Inspect the concept object.',
        duration: 1200,
        camera: { movement: { mode: 'orbit', speed: 1 } },
        objects: ['obj-1'],
        animations: ['anim-1'],
        narration: { text: 'Start here.' },
        interaction: { type: 'inspect', targetObjectId: 'obj-1' },
        completionRule: { type: 'manual', value: null }
      }
    ],
    objects: [
      {
        id: 'obj-1',
        type: 'concept-node',
        name: 'Core Concept',
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        visible: true,
        enabled: true,
        interactive: true,
        highlightable: true,
        clickable: true,
        animationIds: ['anim-1'],
        labelIds: ['label-1'],
        metadata: { category: 'concept', asset: 'concept-node' },
        state: {},
        properties: { color: '#34d399', facts: ['Important concept'] },
        extensions: {}
      }
    ],
    labels: [{ id: 'label-1', text: 'Core Concept', targetObjectId: 'obj-1' }],
    interactions: [{ id: 'interaction-1', label: 'Inspect', details: ['Inspect this concept'], targetObjectId: 'obj-1' }],
    animations: [{ id: 'anim-1', targetObjectId: 'obj-1', type: 'highlight', duration: 1000 }],
    metadata: { confidence: 0.8 },
    ...overrides
  };
}

function createMockProvider(handler) {
  return {
    id: 'mock-provider',
    supportsJsonMode: true,
    supportsAbort: true,
    metadata: { test: true },
    calls: 0,
    async generateStructuredScene(args) {
      this.calls += 1;
      return handler.call(this, args, this.calls);
    }
  };
}

function makeStatusError(statusCode, message) {
  const error = new Error(message || `HTTP ${statusCode}`);
  error.statusCode = statusCode;
  return error;
}

const baseInput = {
  lessonId: 'lesson-1',
  title: 'Neural Signal Pathways',
  topic: 'Neural Signal Pathways',
  lesson: 'Explain how signals move through a neuron and synapse.',
  learningGoals: ['Understand neuron structure', 'Explain synaptic transmission'],
  keyConcepts: ['Neuron', 'Synapse', 'Signal transmission'],
  lessonSteps: ['Identify parts', 'Follow signal path', 'Apply to example'],
  classification: {
    domain: 'Custom',
    subDomain: 'Neural Signal Pathways',
    visualization: 'Adaptive',
    sceneComplexity: 'medium',
    objectCategory: 'Dynamic',
    animationCategory: 'Guided Motion',
    interactionCategory: 'Exploration',
    interaction: 'Exploration',
    confidence: 0.7,
    metadata: {}
  }
};

let inputCounter = 0;
function testInput(overrides = {}) {
  inputCounter += 1;
  return {
    ...baseInput,
    lessonId: `lesson-${inputCounter}`,
    ...overrides
  };
}

test('successful structured AI scene response', async () => {
  sceneGenerationCache.clear();
  const provider = createMockProvider(async () => ({ text: JSON.stringify(buildSceneCandidate()) }));

  const result = await generateUniversalScene(testInput(), { provider, useCache: false });
  assert.equal(result.status, 'success');
  assert.equal(result.fallbackUsed, false);
  assert.ok(result.scene?.sceneId);
  assert.ok(result.runtimeGraph?.nodes?.length >= 1);
  assert.ok(result.rendererPayload?.objects?.length >= 1);
});

test('JSON inside markdown fences', async () => {
  const provider = createMockProvider(async () => ({ text: `\n\n\`\`\`json\n${JSON.stringify(buildSceneCandidate())}\n\`\`\`` }));
  const result = await generateUniversalScene(testInput(), { provider, useCache: false });
  assert.equal(result.status, 'success');
});

test('text before and after JSON', async () => {
  const provider = createMockProvider(async () => ({ text: `preface text ${JSON.stringify(buildSceneCandidate())} trailing text` }));
  const result = await generateUniversalScene(testInput(), { provider, useCache: false });
  assert.equal(result.status, 'success');
});

test('double-encoded JSON', async () => {
  const provider = createMockProvider(async () => ({ text: JSON.stringify(JSON.stringify(buildSceneCandidate())) }));
  const result = await generateUniversalScene(testInput(), { provider, useCache: false });
  assert.equal(result.status, 'success');
});

test('multiple JSON candidates', async () => {
  const weak = { title: 'weak' };
  const strong = buildSceneCandidate({ sceneId: 'scene-strong' });
  const provider = createMockProvider(async () => ({ text: `${JSON.stringify(weak)} ${JSON.stringify(strong)}` }));
  const result = await generateUniversalScene(testInput(), { provider, useCache: false });
  assert.equal(result.scene.sceneId, 'scene-strong');
});

test('candidate scoring prefers schema-compatible scene', () => {
  const parsed = parseSceneResponse({ text: `${JSON.stringify({ a: 1 })}${JSON.stringify(buildSceneCandidate({ sceneId: 'scene-score' }))}` });
  assert.equal(parsed.scene.sceneId, 'scene-score');
  assert.ok(parsed.selectedCandidateScore > 1);
});

test('trailing comma repair', async () => {
  const raw = `{"title":"Adaptive","subject":"Topic","classification":{"domain":"Custom",},"objects":[],"timeline":[],"labels":[],"interactions":[]}`;
  const provider = createMockProvider(async () => ({ text: raw }));
  const result = await generateUniversalScene(testInput(), { provider, useCache: false });
  assert.ok(result.scene.classification);
});

test('missing camera repaired', async () => {
  const provider = createMockProvider(async () => ({ text: JSON.stringify(buildSceneCandidate({ camera: null })) }));
  const result = await generateUniversalScene(testInput(), { provider, useCache: false });
  assert.ok(result.scene.camera);
});

test('missing IDs repaired', async () => {
  const scene = buildSceneCandidate({
    sceneId: '',
    objects: [{ type: 'concept-node', name: 'Unnamed', position: [0, 0, 0], scale: [1, 1, 1] }]
  });
  const provider = createMockProvider(async () => ({ text: JSON.stringify(scene) }));
  const result = await generateUniversalScene(testInput(), { provider, useCache: false });
  assert.ok(result.scene.sceneId);
  assert.ok(result.scene.objects[0].id);
});

test('broken references detected', async () => {
  const scene = buildSceneCandidate({ timeline: [{ ...buildSceneCandidate().timeline[0], objects: ['missing-id'] }] });
  const provider = createMockProvider(async () => ({ text: JSON.stringify(scene) }));
  const result = await generateUniversalScene(testInput(), { provider, useCache: false });
  assert.ok(result.runtimeScene?.diagnostics?.warnings?.some((entry) => String(entry).includes('placeholder')));
});

test('invalid scene falls back', async () => {
  const provider = createMockProvider(async () => ({ text: 'not valid json at all' }));
  const result = await generateUniversalScene(testInput(), { provider, useCache: false });
  assert.equal(result.status, 'fallback');
  assert.equal(result.fallbackUsed, true);
});

test('provider timeout', async () => {
  const provider = createMockProvider(async ({ signal }) => new Promise((resolve, reject) => {
    const timer = setTimeout(() => resolve({ text: JSON.stringify(buildSceneCandidate()) }), 260);
    signal?.addEventListener?.('abort', () => {
      clearTimeout(timer);
      const error = new Error('aborted');
      error.name = 'AbortError';
      reject(error);
    }, { once: true });
  }));

  const result = await generateUniversalScene(testInput(), { provider, useCache: false, timeoutMs: 100, maxRetries: 0 });
  assert.equal(result.status, 'fallback');
});

test('AbortSignal cancellation', async () => {
  const controller = new AbortController();
  const provider = createMockProvider(async ({ signal }) => new Promise((resolve, reject) => {
    const timer = setTimeout(() => resolve({ text: JSON.stringify(buildSceneCandidate()) }), 100);
    signal?.addEventListener?.('abort', () => {
      clearTimeout(timer);
      const error = new Error('aborted');
      error.name = 'AbortError';
      reject(error);
    }, { once: true });
  }));

  const promise = generateUniversalScene(testInput(), { provider, useCache: false, signal: controller.signal });
  controller.abort();
  const result = await promise;
  assert.equal(result.status, 'cancelled');
  assert.equal(result.fallbackUsed, false);
});

test('HTTP 429 retries', async () => {
  const provider = createMockProvider(async (_args, callCount) => {
    if (callCount < 3) throw makeStatusError(429, 'Too many requests');
    return { text: JSON.stringify(buildSceneCandidate()) };
  });

  const result = await generateUniversalScene(testInput(), { provider, useCache: false, maxRetries: 2 });
  assert.equal(result.status, 'success');
  assert.equal(provider.calls, 3);
});

test('HTTP 500 retries', async () => {
  const provider = createMockProvider(async (_args, callCount) => {
    if (callCount < 2) throw makeStatusError(500, 'Server unavailable');
    return { text: JSON.stringify(buildSceneCandidate()) };
  });
  const result = await generateUniversalScene(testInput(), { provider, useCache: false, maxRetries: 2 });
  assert.equal(result.status, 'success');
  assert.equal(provider.calls, 2);
});

test('HTTP 402 does not retry repeatedly', async () => {
  const provider = createMockProvider(async () => {
    throw makeStatusError(402, 'Insufficient credits');
  });
  const result = await generateUniversalScene(testInput(), { provider, useCache: false, maxRetries: 3 });
  assert.equal(result.status, 'fallback');
  assert.equal(provider.calls, 1);
});

test('invalid API key does not retry', async () => {
  const provider = createMockProvider(async () => {
    throw makeStatusError(401, 'Invalid key');
  });
  const result = await generateUniversalScene(testInput(), { provider, useCache: false, maxRetries: 3 });
  assert.equal(result.status, 'fallback');
  assert.equal(provider.calls, 1);
});

test('retry delay respects cancellation', async () => {
  const controller = new AbortController();
  const provider = createMockProvider(async () => {
    throw makeStatusError(429, 'Rate limited');
  });
  const promise = generateUniversalScene(testInput(), {
    provider,
    useCache: false,
    signal: controller.signal,
    maxRetries: 3
  });
  setTimeout(() => controller.abort(), 10);
  const result = await promise;
  assert.equal(result.status, 'cancelled');
});

test('duplicate concurrent generation is deduplicated', async () => {
  const provider = createMockProvider(async () => new Promise((resolve) => {
    setTimeout(() => resolve({ text: JSON.stringify(buildSceneCandidate()) }), 20);
  }));

  const dedupeInput = testInput({ lessonId: 'dedupe-lesson' });
  const [one, two] = await Promise.all([
    generateUniversalScene(dedupeInput, { provider, useCache: false }),
    generateUniversalScene(dedupeInput, { provider, useCache: false })
  ]);

  assert.equal(one.status, 'success');
  assert.equal(two.status, 'success');
  assert.equal(provider.calls, 1);
});

test('cache hit avoids AI request', async () => {
  sceneGenerationCache.clear();
  const provider = createMockProvider(async () => ({ text: JSON.stringify(buildSceneCandidate({ sceneId: 'cache-hit' })) }));
  const cacheInput = testInput({ lessonId: 'cache-lesson' });
  const first = await generateUniversalScene(cacheInput, { provider, useCache: true });
  const second = await generateUniversalScene(cacheInput, { provider, useCache: true });

  assert.equal(first.status, 'success');
  assert.equal(second.source, 'cache');
  assert.equal(provider.calls, 1);
});

test('invalid cached scene is rejected', async () => {
  sceneGenerationCache.clear();
  const provider = createMockProvider(async () => ({ text: JSON.stringify(buildSceneCandidate({ sceneId: 'after-invalid-cache' })) }));
  const cacheInput = testInput({ lessonId: 'invalid-cache-lesson' });
  const first = await generateUniversalScene(cacheInput, { provider, useCache: true });
  sceneGenerationCache.set(first.diagnostics.cacheKey, {
    scene: 'invalid-scene',
    schemaVersion: 'v2',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 10000).toISOString()
  });

  const second = await generateUniversalScene(cacheInput, { provider, useCache: true });
  assert.equal(second.status, 'success');
  assert.equal(second.source, 'ai');
  assert.equal(provider.calls, 2);
});

test('old cached schema migrates', async () => {
  sceneGenerationCache.clear();
  const provider = createMockProvider(async () => ({ text: JSON.stringify(buildSceneCandidate({ version: 'v1' })) }));
  const cacheInput = testInput({ lessonId: 'migrate-cache-lesson' });
  const first = await generateUniversalScene(cacheInput, { provider, useCache: true });
  const second = await generateUniversalScene(cacheInput, { provider, useCache: true });
  assert.equal(first.scene.version, 'v2');
  assert.equal(second.scene.version, 'v2');
  assert.equal(second.source, 'cache');
});

test('unknown topic produces dynamic fallback', async () => {
  const provider = createMockProvider(async () => {
    throw makeStatusError(503, 'Unavailable');
  });
  const result = await generateUniversalScene({
    lesson: 'zxqv orbital symbolic protocol for unknown future topic',
    topic: 'ZXQV Orbital Protocol'
  }, { provider, useCache: false });
  assert.equal(result.status, 'fallback');
  assert.ok(result.rendererPayload.objects.length >= 1);
});

test('empty lesson produces minimal safe scene', async () => {
  const provider = createMockProvider(async () => {
    throw makeStatusError(503, 'Unavailable');
  });
  const result = await generateUniversalScene({}, { provider, useCache: false });
  assert.equal(result.status, 'fallback');
  assert.ok(result.scene.objects.length >= 1);
  assert.ok(result.scene.timeline.length >= 1);
});

test('very long lesson is compacted', async () => {
  const longText = 'A'.repeat(50000);
  const provider = createMockProvider(async () => ({ text: JSON.stringify(buildSceneCandidate()) }));
  const result = await generateUniversalScene(testInput({ lesson: longText }), { provider, useCache: false });
  assert.ok(result.diagnostics.compactedInputLength < result.diagnostics.inputLength);
});

test('output token value is clamped to 4096', async () => {
  let seenTokens = 0;
  const provider = createMockProvider(async (args) => {
    seenTokens = Number(args?.maxTokens || 0);
    return { text: JSON.stringify(buildSceneCandidate()) };
  });
  const result = await generateUniversalScene(testInput(), { provider, useCache: false, maxOutputTokens: 65536 });
  assert.equal(result.status, 'success');
  assert.equal(seenTokens, 4096);
});

test('no API key appears in diagnostics', async () => {
  const provider = createMockProvider(async () => ({ text: JSON.stringify(buildSceneCandidate()) }));
  const result = await generateUniversalScene(testInput(), { provider, useCache: false, devMode: true });
  const serialized = JSON.stringify(result.diagnostics);
  assert.equal(serialized.includes('sk-'), false);
  assert.equal(serialized.toLowerCase().includes('authorization'), false);
});

test('no raw AI text reaches renderer payload', async () => {
  const raw = `AI preface should not leak ${JSON.stringify(buildSceneCandidate())} trailing`; 
  const provider = createMockProvider(async () => ({ text: raw }));
  const result = await generateUniversalScene(testInput(), { provider, useCache: false });
  const payloadText = JSON.stringify(result.rendererPayload);
  assert.equal(payloadText.includes('AI preface should not leak'), false);
});

test('prototype pollution keys are removed', async () => {
  const pollutedJson = `{"title":"Adaptive","subject":"Topic","classification":{"domain":"Custom"},"objects":[{"id":"obj-1","name":"Core","type":"concept","metadata":{"__proto__":{"polluted":"yes"}}}],"timeline":[],"labels":[],"interactions":[]}`;
  const provider = createMockProvider(async () => ({ text: pollutedJson }));
  await generateUniversalScene(testInput(), { provider, useCache: false });
  assert.equal(({}).polluted, undefined);
});

test('fallback passes Scene validation', async () => {
  const provider = createMockProvider(async () => {
    throw makeStatusError(503, 'Unavailable');
  });
  const result = await generateUniversalScene(testInput(), { provider, useCache: false });
  assert.ok(result.scene.validation);
});

test('fallback builds Runtime Scene Graph', async () => {
  const provider = createMockProvider(async () => {
    throw makeStatusError(503, 'Unavailable');
  });
  const result = await generateUniversalScene(testInput(), { provider, useCache: false });
  assert.ok(result.runtimeGraph.nodes.length >= 1);
});

test('renderer payload is materialized from Runtime Scene Graph', async () => {
  const provider = createMockProvider(async () => ({ text: JSON.stringify(buildSceneCandidate()) }));
  const result = await generateUniversalScene(testInput(), { provider, useCache: false });
  const objectNodeCount = result.runtimeGraph.nodes.filter((node) => node?.metadata?.sourceKey === 'objects').length;
  assert.equal(result.rendererPayload.objects.length, objectNodeCount);
});

test('legacy objects are transformed into educational objects and instances', async () => {
  const provider = createMockProvider(async () => ({ text: JSON.stringify(buildSceneCandidate()) }));
  const result = await generateUniversalScene(testInput(), { provider, useCache: false });

  assert.ok(Array.isArray(result.scene.educationalObjects));
  assert.ok(Array.isArray(result.scene.educationalObjectInstances));
  assert.equal(result.scene.educationalObjects.length >= 1, true);
  assert.equal(result.scene.educationalObjectInstances.length >= 1, true);
  assert.ok(result.scene.objectDiagnostics?.summary);
});

test('renderer payload remains graph-derived with educational object instances', async () => {
  const provider = createMockProvider(async () => ({ text: JSON.stringify(buildSceneCandidate()) }));
  const result = await generateUniversalScene(testInput(), { provider, useCache: false });

  const instanceNodes = result.runtimeGraph.nodes.filter((node) => node?.metadata?.sourceKey === 'educationalObjectInstances');
  if (instanceNodes.length > 0) {
    assert.equal(result.rendererPayload.objects.length, instanceNodes.length);
  } else {
    const objectNodes = result.runtimeGraph.nodes.filter((node) => node?.metadata?.sourceKey === 'objects');
    assert.equal(result.rendererPayload.objects.length, objectNodes.length);
  }
});

test('scene pipeline stores educational object generation metadata and runtime graph preserves object runtime metadata', async () => {
  const provider = createMockProvider(async () => ({ text: JSON.stringify(buildSceneCandidate()) }));
  const result = await generateUniversalScene(testInput(), { provider, useCache: false });

  assert.ok(result.scene.metadata.educationalObjectGeneration);
  assert.equal(Array.isArray(result.scene.educationalObjectInstances), true);

  const instanceNode = result.runtimeGraph.nodes.find((node) => node?.metadata?.sourceKey === 'educationalObjectInstances');
  if (instanceNode) {
    assert.ok(instanceNode.properties.runtimeMetadata);
    assert.ok(instanceNode.properties.runtimeMetadata.representation);
    assert.ok(instanceNode.properties.runtimeMetadata.performance);
    assert.ok(instanceNode.properties.runtimeMetadata.accessibility);
  }
});

test('new arbitrary topic works without code changes', async () => {
  const provider = createMockProvider(async () => ({ text: JSON.stringify(buildSceneCandidate({ subject: 'Quantum-historic civic bioinformatics' })) }));
  const result = await generateUniversalScene({
    topic: 'Quantum-historic civic bioinformatics',
    lesson: 'Explain interactions among civic systems and quantum constraints.'
  }, { provider, useCache: false });
  assert.equal(result.status, 'success');
});

test('performance-profile limits are enforced', async () => {
  const manyObjects = Array.from({ length: 80 }, (_, index) => ({
    ...buildSceneCandidate().objects[0],
    id: `obj-${index + 1}`,
    name: `Object ${index + 1}`
  }));
  const provider = createMockProvider(async () => ({ text: JSON.stringify(buildSceneCandidate({ objects: manyObjects })) }));
  const result = await generateUniversalScene(testInput(), { provider, useCache: false, performanceProfile: 'low' });
  assert.ok(result.rendererPayload.objects.length <= 20);
});

test('scene generation works without configured AI provider', async () => {
  const result = await generateUniversalScene(testInput(), {
    provider: {
      id: 'none',
      supportsJsonMode: false,
      supportsAbort: true,
      metadata: {},
      async generateStructuredScene() {
        throw makeStatusError(503, 'Provider unavailable');
      }
    },
    useCache: false,
    useAI: true
  });

  assert.equal(result.status, 'fallback');
  assert.equal(result.fallbackUsed, true);
});
