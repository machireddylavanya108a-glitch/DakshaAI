import test from 'node:test';
import assert from 'node:assert/strict';
import { buildUniversalLearningArtifacts } from './universalLearningPipeline.js';

test('buildUniversalLearningArtifacts returns the full learning suite', () => {
  const suite = buildUniversalLearningArtifacts({
    sourceMeta: {
      sourceType: 'pdf',
      subject: 'Physics',
      difficulty: 'Medium',
      language: 'English',
      capabilityTemplateRecommendation: {
        schemaVersion: 'v2',
        recommendedCapabilities: [],
        recommendedTemplates: [],
        requiredEducationalObjects: {
          objectCountHint: 1,
          objectTypes: ['concept-node'],
          requiresHierarchy: false,
          requiresRelationshipEdges: false,
          supportsUnknownObjectTypes: true
        },
        animationCapabilities: [],
        interactionCapabilities: [],
        simulationCapabilities: [],
        assessmentCapabilities: [],
        narrationCapabilities: [],
        confidenceScore: 0.5,
        fallbackStrategy: {
          mode: 'template-recommendation',
          recommendProceduralGeneration: false,
          reason: 'templates-available',
          fallbackTemplateId: '',
          confidence: 0.5,
          supportsUnknownFutureTypes: true
        },
        diagnostics: {},
        metadata: {}
      },
      confidenceConflictFallback: {
        schemaVersion: 'v2',
        overallConfidence: 0.6,
        reasoningConfidence: 0.6,
        visualizationConfidence: 0.6,
        templateConfidence: 0.6,
        interactionConfidence: 0.6,
        narrationConfidence: 0.6,
        recoveryConfidence: 0.6,
        additionalConfidenceMetrics: [],
        conflicts: [],
        conflictResolution: {
          resolutions: [],
          unresolved: [],
          allResolved: true
        },
        fallbackPlan: {
          recommended: false,
          reason: 'confidence-acceptable',
          actions: [],
          preserveLearningQuality: true,
          supportsUnknownFutureFallbackModes: true
        },
        diagnostics: {},
        metadata: {}
      }
    },
    sourceModel: {
      title: 'Physics PDF',
      overview: 'Forces and motion',
      extractedText: 'Force and motion explain acceleration.',
      headings: ['Introduction'],
      definitions: ['Force is a push or pull.'],
      diagrams: ['Diagram'],
      concepts: ['Force', 'Motion'],
      tables: []
    },
    learningSession: {
      title: 'Physics Lesson',
      summary: 'Study force and motion.',
      beginnerLesson: 'Beginner lesson',
      intermediateLesson: 'Intermediate lesson',
      advancedLesson: 'Advanced lesson',
      keyConcepts: ['Force', 'Motion'],
      importantDefinitions: ['Force'],
      examples: ['Example'],
      realWorldApplications: ['Application'],
      revisionNotes: ['Revision'],
      cheatSheet: ['Cheat'],
      flashcards: [{ front: 'Force', back: 'Push or pull' }],
      quiz: [{ question: 'What is force?', answer: 'A push or pull.' }],
      mindMap: 'Force -> Motion',
      learningRoadmap: ['Learn force', 'Practice motion'],
      practice: { questions: ['Question 1'], adaptiveDifficulty: 'Medium' },
      notes: { concise: ['Short note'], full: ['Detailed note'] }
    },
    detections: { practicalSkills: ['Lab'] }
  });

  assert.ok(suite.learningSession.summary.includes('Study'));
  assert.equal(suite.aiTeacher.language, 'English');
  assert.ok(Array.isArray(suite.roadmap));
  assert.ok(Array.isArray(suite.quiz));
  assert.ok(Array.isArray(suite.flashcards));
  assert.ok(suite.memoryEntry.concepts.includes('Force'));
  assert.ok(suite.progressEntry.recommendedNext);
  assert.ok(suite.knowledgeGraph);
  assert.ok(suite.knowledgeGraph.conceptGraph.includes('Force'));
  assert.ok(suite.knowledgeGraph.skillGraph.includes('Physics'));
  assert.ok(suite.knowledgeGraph.learningTree.includes('Physics'));
  assert.ok(suite.visualizationStrategy);
  assert.ok(suite.visualizationStrategy.primaryStrategy);
  assert.ok(Array.isArray(suite.visualizationStrategy.strategies));
  assert.ok(suite.capabilityTemplateRecommendation);
  assert.equal(suite.capabilityTemplateRecommendation.schemaVersion, 'v2');
  assert.ok(suite.confidenceConflictFallback);
  assert.equal(suite.confidenceConflictFallback.schemaVersion, 'v2');
  assert.ok(suite.aiTeacher.narrationStrategy);
});
