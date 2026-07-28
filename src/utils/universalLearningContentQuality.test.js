import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeVisionOutput,
  resolveLearningTopic,
  deriveDeterministicCounts,
  estimateLearningPlanSize,
  buildIndependentLearningAssets,
  validateLearningOutput,
  buildReliabilityFallbackMessage
} from './universalLearningContentQuality.js';
import { buildPersonalizedLearningPlan } from './personalizedLearningEngine.js';

const futuristicDescription = 'A futuristic classroom with screens showing code, anatomy and analytical graphics. Digital learning interfaces connect AI, visualization and interdisciplinary education.';

test('image description does not become the raw title sentence', () => {
  const normalized = normalizeVisionOutput({
    sourceType: 'image',
    sourceName: 'Screenshot 2026-07-28.png',
    rawExtractedContent: futuristicDescription,
    visualDescription: futuristicDescription
  });

  assert.equal(normalized.topic, 'Technology-Enhanced Learning');
  assert.notEqual(normalized.topic, futuristicDescription);
});

test('filename and first sentence are not used as the topic', () => {
  const topicFromFilename = resolveLearningTopic({
    sourceName: 'Screenshot 2026-07-28 at 14.45.02.png',
    rawExtractedContent: ''
  });
  const topicFromSentence = resolveLearningTopic({
    sourceName: 'uploaded-image.png',
    rawExtractedContent: 'visible portion image depicts futuristic digital learning environment with charts and anatomy screens.'
  });

  assert.equal(topicFromFilename.title, 'Topic not detected yet');
  assert.doesNotMatch(topicFromSentence.title.toLowerCase(), /^visible portion image depicts/);
  assert.ok(topicFromSentence.title.length <= 80);
});

test('decorative image creates a micro lesson plan size', () => {
  const normalized = normalizeVisionOutput({
    sourceType: 'image',
    sourceName: 'wallpaper.png',
    rawExtractedContent: 'Aesthetic wallpaper background with abstract gradient shapes.',
    visualDescription: 'Aesthetic wallpaper background with abstract gradient shapes.'
  });
  const plan = estimateLearningPlanSize({
    sourceType: 'image',
    classification: normalized.classification,
    conceptCount: normalized.detectedConcepts.length,
    difficulty: normalized.difficulty,
    textLength: normalized.rawExtractedContent.length
  });

  assert.equal(plan.size, 'micro');
  assert.ok(plan.estimatedMinutes <= 25);
});

test('one image does not generate a 92 day personalized plan', () => {
  const plan = buildPersonalizedLearningPlan({
    interviewAnswers: { learnTopic: 'Technology-Enhanced Learning' },
    sourceContext: 'image',
    sourceLabel: 'Technology-Enhanced Learning',
    flowType: 'content-first',
    contentInsights: {
      estimatedLearning: { estimatedMinutes: 30, size: 'micro' },
      roadmapSubtopics: ['Digital learning environments', 'AI in education'],
      careerLayer: { status: 'not_applicable' }
    }
  });

  assert.equal(plan.estimatedCompletion.planSize, 'micro');
  assert.ok(plan.estimatedCompletion.totalLearningHours < 1);
  assert.ok(!/92\s*days?/i.test(plan.estimatedCompletion.estimatedCompletionTime));
});

test('career layer is hidden and interview badge is not injected in content-first flow', () => {
  const plan = buildPersonalizedLearningPlan({
    interviewAnswers: { learnTopic: 'General concept image' },
    sourceContext: 'image',
    flowType: 'content-first',
    contentInsights: {
      estimatedLearning: { estimatedMinutes: 20, size: 'micro' },
      careerLayer: { status: 'not_applicable' }
    }
  });

  assert.equal(plan.plan.status, 'not_applicable');
  assert.equal(plan.plan.careerPaths.length, 0);
  assert.ok(!plan.progress.achievementBadges.includes('Interview Completed'));
});

test('deterministic counts and mind map structure are always returned', () => {
  const normalized = normalizeVisionOutput({
    sourceType: 'image',
    sourceName: 'future-learning.png',
    rawExtractedContent: futuristicDescription,
    visualDescription: futuristicDescription
  });
  const counts = deriveDeterministicCounts(normalized);
  const plan = estimateLearningPlanSize({
    sourceType: 'image',
    classification: normalized.classification,
    conceptCount: normalized.detectedConcepts.length,
    difficulty: normalized.difficulty,
    textLength: normalized.rawExtractedContent.length
  });
  const assets = buildIndependentLearningAssets({
    topicResolution: normalized.topicResolution,
    normalizedContent: normalized,
    deterministicCounts: counts,
    planSize: plan
  });

  assert.equal(counts.images.count, 1);
  assert.ok(['detected', 'not confidently detected', 'none detected', 'no clear chapter divisions'].includes(counts.diagrams.status));
  assert.ok(Array.isArray(assets.mindMap.nodes));
  assert.ok(Array.isArray(assets.mindMap.edges));
  assert.ok(assets.mindMap.nodes.length > 0);
  assert.ok(assets.mindMap.edges.length > 0);
});

test('sections are independently generated and base64 is stripped', () => {
  const rawWithBase64 = `data:image/png;base64,${'A'.repeat(220)}`;
  const normalized = normalizeVisionOutput({
    sourceType: 'image',
    sourceName: 'future-learning.png',
    rawExtractedContent: `${futuristicDescription}\n${rawWithBase64}`,
    visualDescription: futuristicDescription
  });
  const counts = deriveDeterministicCounts(normalized);
  const plan = estimateLearningPlanSize({
    sourceType: 'image',
    classification: normalized.classification,
    conceptCount: normalized.detectedConcepts.length,
    difficulty: normalized.difficulty,
    textLength: normalized.rawExtractedContent.length
  });
  const assets = buildIndependentLearningAssets({
    topicResolution: normalized.topicResolution,
    normalizedContent: normalized,
    deterministicCounts: counts,
    planSize: plan
  });

  const validation = validateLearningOutput({
    topicResolution: normalized.topicResolution,
    assets,
    normalizedContent: normalized,
    deterministicCounts: counts,
    planSize: plan,
    flowType: 'content-first'
  });

  assert.equal(validation.isValid, true);
  assert.ok(!JSON.stringify(assets).includes('base64'));
  assert.ok(!JSON.stringify(normalized).includes('data:image/png;base64'));
});

test('fallback message is explicit when assets are unreliable', () => {
  assert.equal(
    buildReliabilityFallbackMessage(),
    'We understood the source, but some learning assets could not be generated reliably.'
  );
});
