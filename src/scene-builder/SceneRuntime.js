import { processSceneJsonPipeline } from '../scene-generator/SceneVersionManager.js';
import { buildRuntimeSceneGraph } from './SceneBuilder.js';
import { TimelineScheduler, createTimelineSynchronizationRuntime } from '../timeline/runtime/index.js';
import { createSceneEventRuntime } from '../scene-events/index.js';
import { createNarrationSceneSynchronizationRuntime } from '../narration/index.js';
import { createSpeechPlaybackRuntimeController } from '../speech/index.js';
import { createAdaptiveTeachingRecoveryEngine } from '../adaptive-learning/index.js';
import { createUniversalAITeacherEngine } from '../ai-teacher/index.js';
import { createUniversalInteractionContractRuntime } from '../interactions/index.js';
import { createUniversalQuizAdaptiveAssessmentEngine } from '../assessment-engine/index.js';
import { createUniversalLearningAnalyticsMasteryEngine } from '../learning-analytics/index.js';
import { createUniversalAIContentCreationEngine } from '../content-creation/index.js';
import { createUniversalAICourseAuthoringCurriculumEngine } from '../course-authoring/index.js';
import { createUniversalInputCameraControlRuntime } from '../input-camera/index.js';
import { createUniversalEducationalInspectionRuntime } from '../inspection/index.js';
import { createUniversalAccessibilityStateRecoveryRuntime } from '../accessibility/index.js';
import { createUniversalAssetLoadingRuntime } from '../asset-runtime/index.js';
import {
  createUniversalRendererCore,
  createUniversalAnimationTimelineIntegrationRuntime,
  createUniversalAdaptiveRenderingPerformanceRuntime
} from '../renderer-core/index.js';

let activeRuntime = null;
let educationalObjectLifecycleManager = null;

function attachTimelineScheduler(runtime) {
  if (!runtime || typeof runtime !== 'object') return runtime;

  const timelineData = runtime?.metadata?.timelineData || runtime?.metadata?.timeline || runtime?.sceneJson?.timelineData || {};
  const scheduler = new TimelineScheduler(timelineData, {
    startState: 'Ready'
  });

  runtime.timelineScheduler = scheduler;
  runtime.sceneScheduler = scheduler;
  runtime.metadata = {
    ...(runtime.metadata || {}),
    timelineScheduler: {
      playbackState: scheduler.playbackState.getState(),
      supportedEvents: TimelineScheduler.supportedRuntimeEvents()
    }
  };

  return runtime;
}

function attachSceneEventRuntime(runtime) {
  if (!runtime || typeof runtime !== 'object') return runtime;

  const sceneEventRuntime = createSceneEventRuntime(runtime);
  runtime.sceneEventRuntime = sceneEventRuntime;
  runtime.sceneEventSystem = sceneEventRuntime;
  runtime.metadata = {
    ...(runtime.metadata || {}),
    sceneEvents: {
      eventCount: sceneEventRuntime.events.length,
      schedule: sceneEventRuntime.schedule.summary,
      validation: {
        status: sceneEventRuntime.schedule.validation.status,
        errors: sceneEventRuntime.schedule.validation.errors,
        warnings: sceneEventRuntime.schedule.validation.warnings
      }
    }
  };

  return runtime;
}

function attachTimelineSynchronizationRuntime(runtime) {
  if (!runtime || typeof runtime !== 'object') return runtime;

  const synchronizationRuntime = createTimelineSynchronizationRuntime(runtime);
  runtime.timelineSynchronizationRuntime = synchronizationRuntime;
  runtime.timelineSynchronization = synchronizationRuntime;

  const recovered = synchronizationRuntime.recoverSession();
  const sharedState = synchronizationRuntime.synchronize('attach', {
    recovered
  }, {
    recovered
  });

  runtime.sharedRuntimeState = sharedState;
  runtime.metadata = {
    ...(runtime.metadata || {}),
    timelineSynchronization: {
      schemaVersion: sharedState.schemaVersion,
      recovered,
      channels: synchronizationRuntime.constructor.supportedChannels()
    }
  };

  return runtime;
}

function attachNarrationSynchronizationRuntime(runtime) {
  if (!runtime || typeof runtime !== 'object') return runtime;

  const narrationSynchronizationRuntime = createNarrationSceneSynchronizationRuntime(runtime);
  runtime.narrationSynchronizationRuntime = narrationSynchronizationRuntime;

  runtime.metadata = {
    ...(runtime.metadata || {}),
    narrationSynchronization: {
      ...(narrationSynchronizationRuntime.snapshot?.() || {}),
      channels: narrationSynchronizationRuntime.constructor.supportedChannels()
    }
  };

  return runtime;
}

function attachSpeechPlaybackRuntime(runtime) {
  if (!runtime || typeof runtime !== 'object') return runtime;

  const speechPlaybackRuntime = createSpeechPlaybackRuntimeController(runtime);
  runtime.speechPlaybackRuntime = speechPlaybackRuntime;

  const recovered = speechPlaybackRuntime.recoverSession();
  const snapshot = speechPlaybackRuntime.synchronize('attach', {
    recovered
  });

  runtime.metadata = {
    ...(runtime.metadata || {}),
    speechPlayback: {
      ...snapshot,
      recovered,
      channels: speechPlaybackRuntime.constructor.supportedChannels()
    }
  };

  return runtime;
}

function attachAdaptiveTeachingRuntime(runtime) {
  if (!runtime || typeof runtime !== 'object') return runtime;

  const adaptiveTeachingRuntime = createAdaptiveTeachingRecoveryEngine(runtime);
  runtime.adaptiveTeachingRuntime = adaptiveTeachingRuntime;

  const recovered = adaptiveTeachingRuntime.recoverSession();
  const snapshot = adaptiveTeachingRuntime.synchronize('attach', {
    recovered
  });

  runtime.metadata = {
    ...(runtime.metadata || {}),
    adaptiveLearning: {
      ...snapshot,
      recovered,
      channels: adaptiveTeachingRuntime.constructor.supportedChannels()
    }
  };

  return runtime;
}

function attachUniversalAITeacherRuntime(runtime) {
  if (!runtime || typeof runtime !== 'object') return runtime;

  const aiTeacherRuntime = createUniversalAITeacherEngine(runtime);
  runtime.aiTeacherRuntime = aiTeacherRuntime;

  const recovered = aiTeacherRuntime.recoverSession();
  const snapshot = aiTeacherRuntime.synchronize('attach', {
    lessonGraph: runtime?.metadata?.lessonGraph || null,
    runtimeGraph: runtime?.graph?.toJSON?.() || null,
    timeline: runtime?.metadata?.timeline || null,
    learningIntent: runtime?.metadata?.intentProfile || runtime?.metadata?.learningIntent || null,
    visualizationStrategy: runtime?.metadata?.visualizationStrategy || null,
    userLearningProfile: runtime?.metadata?.userLearningProfile || runtime?.metadata?.learningProfile || null,
    progressState: runtime?.adaptiveTeachingRuntime?.snapshot?.()?.progress || null
  });

  runtime.metadata = {
    ...(runtime.metadata || {}),
    aiTeacherRuntime: {
      ...snapshot,
      recovered,
      channels: aiTeacherRuntime.constructor.supportedChannels()
    },
    aiTeacherAdapter: {
      ...(runtime.metadata?.aiTeacherAdapter || {}),
      runtimeState: snapshot,
      recovered,
      channels: aiTeacherRuntime.constructor.supportedChannels()
    }
  };

  return runtime;
}

function attachUniversalAssessmentRuntime(runtime) {
  if (!runtime || typeof runtime !== 'object') return runtime;

  const assessmentRuntime = createUniversalQuizAdaptiveAssessmentEngine(runtime);
  runtime.assessmentRuntime = assessmentRuntime;

  const recovered = assessmentRuntime.recoverSession();
  const snapshot = assessmentRuntime.synchronize('attach', {
    lessonGraph: runtime?.metadata?.lessonGraph || null,
    runtimeGraph: runtime?.graph?.toJSON?.() || null,
    timeline: runtime?.metadata?.timeline || null,
    aiTeacherMetadata: runtime?.metadata?.aiTeacherAdapter || null,
    learningObjectives: runtime?.metadata?.learningObjectives || runtime?.metadata?.lessonGraph?.learningObjectives || null,
    progressState: runtime?.adaptiveTeachingRuntime?.snapshot?.()?.progress || null,
    userLearningProfile: runtime?.metadata?.userLearningProfile || runtime?.metadata?.learningProfile || null
  });

  runtime.metadata = {
    ...(runtime.metadata || {}),
    assessmentRuntime: {
      ...snapshot,
      recovered,
      channels: assessmentRuntime.constructor.supportedChannels()
    },
    assessmentAdapter: {
      ...(runtime.metadata?.assessmentAdapter || {}),
      runtimeState: snapshot,
      recovered,
      channels: assessmentRuntime.constructor.supportedChannels()
    }
  };

  return runtime;
}

function attachUniversalLearningAnalyticsRuntime(runtime) {
  if (!runtime || typeof runtime !== 'object') return runtime;

  const learningAnalyticsRuntime = createUniversalLearningAnalyticsMasteryEngine(runtime);
  runtime.learningAnalyticsRuntime = learningAnalyticsRuntime;

  const recovered = learningAnalyticsRuntime.recoverSession();
  const snapshot = learningAnalyticsRuntime.synchronize('attach', {
    lessonGraph: runtime?.metadata?.lessonGraph || null,
    runtimeGraph: runtime?.graph?.toJSON?.() || null,
    timeline: runtime?.metadata?.timeline || null,
    aiTeacherEvents: runtime?.metadata?.aiTeacherAdapter?.runtimeState?.history?.recentEvents || null,
    assessmentResults: runtime?.metadata?.assessmentAdapter?.output || null,
    interactionEvents: runtime?.sceneEventRuntime?.events || null,
    userLearningProfile: runtime?.metadata?.userLearningProfile || runtime?.metadata?.learningProfile || null,
    sessionHistory: runtime?.metadata?.sessionHistory || null
  });

  runtime.metadata = {
    ...(runtime.metadata || {}),
    learningAnalyticsRuntime: {
      ...snapshot,
      recovered,
      channels: learningAnalyticsRuntime.constructor.supportedChannels()
    },
    learningAnalyticsAdapter: {
      ...(runtime.metadata?.learningAnalyticsAdapter || {}),
      runtimeState: snapshot,
      recovered,
      channels: learningAnalyticsRuntime.constructor.supportedChannels()
    }
  };

  return runtime;
}

function attachUniversalAIContentCreationRuntime(runtime) {
  if (!runtime || typeof runtime !== 'object') return runtime;

  const contentCreationRuntime = createUniversalAIContentCreationEngine(runtime);
  runtime.contentCreationRuntime = contentCreationRuntime;

  const recovered = contentCreationRuntime.recoverSession();
  const snapshot = contentCreationRuntime.synchronize('attach', {
    lessonGraph: runtime?.metadata?.lessonGraph || null,
    runtimeGraph: runtime?.graph?.toJSON?.() || runtime?.graph || null,
    learningIntent: runtime?.metadata?.intentProfile || runtime?.metadata?.learningIntent || null,
    visualizationStrategy: runtime?.metadata?.visualizationStrategy || null,
    userLearningProfile: runtime?.metadata?.userLearningProfile || runtime?.metadata?.learningProfile || null,
    aiTeacherMetadata: runtime?.metadata?.aiTeacherAdapter || null,
    assessmentMetadata: runtime?.metadata?.assessmentAdapter || null,
    analyticsMetadata: runtime?.metadata?.learningAnalyticsAdapter || null,
    pipeline: runtime?.metadata?.pipeline || runtime?.metadata?.sourceMeta || null
  });

  runtime.metadata = {
    ...(runtime.metadata || {}),
    contentCreationRuntime: {
      ...snapshot,
      recovered,
      channels: contentCreationRuntime.constructor.supportedChannels()
    },
    contentCreationAdapter: {
      ...(runtime.metadata?.contentCreationAdapter || {}),
      runtimeState: snapshot,
      recovered,
      channels: contentCreationRuntime.constructor.supportedChannels()
    }
  };

  return runtime;
}

function attachUniversalAICurriculumAuthoringRuntime(runtime) {
  if (!runtime || typeof runtime !== 'object') return runtime;

  const curriculumAuthoringRuntime = createUniversalAICourseAuthoringCurriculumEngine(runtime);
  runtime.curriculumAuthoringRuntime = curriculumAuthoringRuntime;

  const recovered = curriculumAuthoringRuntime.recoverSession();
  const snapshot = curriculumAuthoringRuntime.synchronize('attach', {
    lessonGraph: runtime?.metadata?.lessonGraph || null,
    runtimeGraph: runtime?.graph?.toJSON?.() || runtime?.graph || null,
    learningIntent: runtime?.metadata?.intentProfile || runtime?.metadata?.learningIntent || null,
    learningAnalytics: runtime?.metadata?.learningAnalyticsAdapter || null,
    assessmentResults: runtime?.metadata?.assessmentAdapter || null,
    aiTeacherMetadata: runtime?.metadata?.aiTeacherAdapter || null,
    userLearningProfile: runtime?.metadata?.userLearningProfile || runtime?.metadata?.learningProfile || null,
    pipeline: runtime?.metadata?.pipeline || runtime?.metadata?.sourceMeta || null
  });

  runtime.metadata = {
    ...(runtime.metadata || {}),
    curriculumAuthoringRuntime: {
      ...snapshot,
      recovered,
      channels: curriculumAuthoringRuntime.constructor.supportedChannels()
    },
    curriculumAuthoringAdapter: {
      ...(runtime.metadata?.curriculumAuthoringAdapter || {}),
      runtimeState: snapshot,
      recovered,
      channels: curriculumAuthoringRuntime.constructor.supportedChannels()
    }
  };

  return runtime;
}

function attachInteractionContractRuntime(runtime) {
  if (!runtime || typeof runtime !== 'object') return runtime;

  const interactionContractRuntime = createUniversalInteractionContractRuntime(runtime);
  runtime.interactionContractRuntime = interactionContractRuntime;

  const recovered = interactionContractRuntime.recoverSession();
  const snapshot = interactionContractRuntime.synchronize('attach', {
    recovered
  });

  runtime.metadata = {
    ...(runtime.metadata || {}),
    interactionContract: {
      ...snapshot,
      recovered,
      channels: interactionContractRuntime.constructor.supportedChannels()
    }
  };

  return runtime;
}

function attachInputCameraControlRuntime(runtime) {
  if (!runtime || typeof runtime !== 'object') return runtime;

  const inputCameraControlRuntime = createUniversalInputCameraControlRuntime(runtime);
  runtime.inputCameraControlRuntime = inputCameraControlRuntime;

  const recovered = inputCameraControlRuntime.recoverSession();
  const snapshot = inputCameraControlRuntime.synchronize('attach', {
    recovered
  });

  runtime.metadata = {
    ...(runtime.metadata || {}),
    inputCameraControl: {
      ...snapshot,
      recovered,
      channels: inputCameraControlRuntime.constructor.supportedChannels()
    }
  };

  return runtime;
}

function attachEducationalInspectionRuntime(runtime) {
  if (!runtime || typeof runtime !== 'object') return runtime;

  const educationalInspectionRuntime = createUniversalEducationalInspectionRuntime(runtime);
  runtime.educationalInspectionRuntime = educationalInspectionRuntime;

  const recovered = educationalInspectionRuntime.recoverSession();
  const snapshot = educationalInspectionRuntime.synchronize('attach', {
    recovered
  });

  runtime.metadata = {
    ...(runtime.metadata || {}),
    educationalInspection: {
      ...snapshot,
      recovered,
      channels: educationalInspectionRuntime.constructor.supportedChannels()
    }
  };

  return runtime;
}

function attachAccessibilityStateRecoveryRuntime(runtime) {
  if (!runtime || typeof runtime !== 'object') return runtime;

  const accessibilityStateRecoveryRuntime = createUniversalAccessibilityStateRecoveryRuntime(runtime);
  runtime.accessibilityStateRecoveryRuntime = accessibilityStateRecoveryRuntime;

  const recovered = accessibilityStateRecoveryRuntime.recoverSession();
  const snapshot = accessibilityStateRecoveryRuntime.synchronize('attach', {
    recovered
  });

  runtime.metadata = {
    ...(runtime.metadata || {}),
    accessibilityRecovery: {
      ...snapshot,
      recovered,
      channels: accessibilityStateRecoveryRuntime.constructor.supportedChannels()
    }
  };

  return runtime;
}

function attachAssetLoadingRuntime(runtime) {
  if (!runtime || typeof runtime !== 'object') return runtime;

  const assetLoadingRuntime = createUniversalAssetLoadingRuntime(runtime);
  runtime.assetLoadingRuntime = assetLoadingRuntime;

  const recovered = assetLoadingRuntime.recoverSession();
  const snapshot = assetLoadingRuntime.synchronize('attach', {
    recovered
  });

  runtime.metadata = {
    ...(runtime.metadata || {}),
    assetLoading: {
      ...snapshot,
      recovered,
      channels: assetLoadingRuntime.constructor.supportedChannels()
    }
  };

  return runtime;
}

function attachUniversalRendererCore(runtime) {
  if (!runtime || typeof runtime !== 'object') return runtime;

  const rendererCore = createUniversalRendererCore(runtime, {
    adapterProfile: {
      strictInputValidation: false,
      includeGenericUnknownNodes: true
    }
  });

  runtime.rendererCore = rendererCore;

  const recovered = rendererCore.recoverSession();
  const initializeResult = rendererCore.initialize({
    sceneId: runtime.sceneId
  });
  const buildResult = rendererCore.build({
    runtimeGraph: runtime.graph?.toJSON?.() || { nodes: [], edges: [] }
  });
  const snapshot = rendererCore.synchronize('attach', {
    recovered,
    initializeStatus: initializeResult.status,
    buildStatus: buildResult.status
  });

  runtime.metadata = {
    ...(runtime.metadata || {}),
    rendererCore: {
      ...snapshot,
      recovered,
      channels: rendererCore.constructor.supportedChannels()
    },
    rendererAdapter: {
      ...(runtime.metadata?.rendererAdapter || {}),
      rendererCoreState: snapshot,
      channels: rendererCore.constructor.supportedChannels()
    }
  };

  return runtime;
}

function attachUniversalAnimationTimelineIntegrationRuntime(runtime) {
  if (!runtime || typeof runtime !== 'object') return runtime;

  const integrationRuntime = createUniversalAnimationTimelineIntegrationRuntime(runtime, {
    persistenceKey: 'daksha.animation.timeline.integration.v1'
  });

  runtime.animationTimelineIntegrationRuntime = integrationRuntime;

  const recovered = integrationRuntime.recoverSession();
  const buildResult = integrationRuntime.build();
  const snapshot = integrationRuntime.synchronize('attach', {
    recovered,
    buildStatus: buildResult.status
  });

  runtime.metadata = {
    ...(runtime.metadata || {}),
    animationTimelineIntegration: {
      ...snapshot,
      recovered,
      channels: integrationRuntime.constructor.supportedChannels()
    },
    rendererAdapter: {
      ...(runtime.metadata?.rendererAdapter || {}),
      animationTimelineIntegrationState: snapshot
    },
    aiTeacherAdapter: {
      ...(runtime.metadata?.aiTeacherAdapter || {}),
      animationTimelineIntegrationState: snapshot
    },
    interactionEngine: {
      ...(runtime.metadata?.interactionEngine || {}),
      animationTimelineIntegrationState: snapshot
    }
  };

  return runtime;
}

function attachUniversalAdaptiveRenderingPerformanceRuntime(runtime) {
  if (!runtime || typeof runtime !== 'object') return runtime;

  const adaptiveRuntime = createUniversalAdaptiveRenderingPerformanceRuntime(runtime, {
    persistenceKey: 'daksha.adaptive.rendering.performance.v1'
  });

  runtime.adaptiveRenderingPerformanceRuntime = adaptiveRuntime;

  const recovered = adaptiveRuntime.recoverSession();
  const buildResult = adaptiveRuntime.build({
    deviceCapabilities: runtime?.metadata?.deviceCapabilities || {},
    userPreferences: runtime?.metadata?.userPreferences || {},
    accessibility: runtime?.metadata?.accessibility || {}
  });
  const snapshot = adaptiveRuntime.synchronize('attach', {
    recovered,
    buildStatus: buildResult.status
  });

  runtime.metadata = {
    ...(runtime.metadata || {}),
    adaptiveRenderingPerformance: {
      ...snapshot,
      recovered,
      channels: adaptiveRuntime.constructor.supportedChannels()
    },
    rendererAdapter: {
      ...(runtime.metadata?.rendererAdapter || {}),
      adaptiveRenderingPerformanceState: snapshot
    },
    aiTeacherAdapter: {
      ...(runtime.metadata?.aiTeacherAdapter || {}),
      adaptiveRenderingPerformanceState: snapshot
    },
    interactionEngine: {
      ...(runtime.metadata?.interactionEngine || {}),
      adaptiveRenderingPerformanceState: snapshot
    }
  };

  return runtime;
}

function runLifecycleCleanupForRuntime(runtime) {
  if (!educationalObjectLifecycleManager || typeof educationalObjectLifecycleManager.cleanupScene !== 'function') {
    return;
  }

  const sceneId = String(runtime?.sceneId || '').trim();
  if (!sceneId) return;

  try {
    educationalObjectLifecycleManager.cleanupScene(sceneId, {
      source: 'scene-runtime-destroy'
    });
  } catch {
    // Lifecycle cleanup is best-effort and must not break scene teardown.
  }
}

function ensureRuntime() {
  if (!activeRuntime) {
    activeRuntime = buildRuntimeSceneGraph(processSceneJsonPipeline({}));
  }
  return activeRuntime;
}

export function buildScene(validatedSceneJson = {}) {
  activeRuntime = attachTimelineSynchronizationRuntime(
    attachUniversalAdaptiveRenderingPerformanceRuntime(
    attachUniversalAnimationTimelineIntegrationRuntime(
    attachUniversalRendererCore(
    attachAssetLoadingRuntime(
    attachAccessibilityStateRecoveryRuntime(
      attachEducationalInspectionRuntime(
        attachInputCameraControlRuntime(
          attachInteractionContractRuntime(
            attachUniversalAICurriculumAuthoringRuntime(
            attachUniversalAITeacherRuntime(
            attachUniversalAssessmentRuntime(
            attachUniversalLearningAnalyticsRuntime(
            attachUniversalAIContentCreationRuntime(
            attachAdaptiveTeachingRuntime(
              attachSpeechPlaybackRuntime(
                attachNarrationSynchronizationRuntime(
                  attachSceneEventRuntime(
                    attachTimelineScheduler(buildRuntimeSceneGraph(validatedSceneJson || {}))
                  )
                )
              )
            )
            )
            )
            )
            )
            )
          )
        )
      )
    )
    )
    )
    )
    )
  );
  return activeRuntime;
}

export function loadScene(sceneJson = {}) {
  const validatedScene = processSceneJsonPipeline(sceneJson || {}, { sourceType: 'runtime' });
  activeRuntime = attachTimelineSynchronizationRuntime(
    attachUniversalAdaptiveRenderingPerformanceRuntime(
    attachUniversalAnimationTimelineIntegrationRuntime(
    attachUniversalRendererCore(
    attachAssetLoadingRuntime(
    attachAccessibilityStateRecoveryRuntime(
      attachEducationalInspectionRuntime(
        attachInputCameraControlRuntime(
          attachInteractionContractRuntime(
            attachUniversalAICurriculumAuthoringRuntime(
            attachUniversalAITeacherRuntime(
            attachUniversalAssessmentRuntime(
            attachUniversalLearningAnalyticsRuntime(
            attachUniversalAIContentCreationRuntime(
            attachAdaptiveTeachingRuntime(
              attachSpeechPlaybackRuntime(
                attachNarrationSynchronizationRuntime(
                  attachSceneEventRuntime(
                    attachTimelineScheduler(buildRuntimeSceneGraph(validatedScene))
                  )
                )
              )
            )
            )
            )
            )
            )
            )
          )
        )
      )
    )
    )
    )
    )
    )
  );
  activeRuntime.stateManager.setActiveAll();
  activeRuntime.adaptiveRenderingPerformanceRuntime?.synchronize?.('scene-loaded');
  activeRuntime.animationTimelineIntegrationRuntime?.synchronize?.('scene-loaded');
  activeRuntime.rendererCore?.synchronize?.('scene-loaded');
  return activeRuntime;
}

export function destroyScene() {
  const runtime = ensureRuntime();
  runLifecycleCleanupForRuntime(runtime);
  runtime.adaptiveRenderingPerformanceRuntime?.persistSession?.();
  runtime.animationTimelineIntegrationRuntime?.persistSession?.();
  runtime.rendererCore?.persistSession?.();
  runtime.timelineSynchronizationRuntime?.persistSession?.();
  runtime.speechPlaybackRuntime?.persistSession?.();
  runtime.adaptiveTeachingRuntime?.persistSession?.();
  runtime.aiTeacherRuntime?.persistSession?.();
  runtime.assessmentRuntime?.persistSession?.();
  runtime.learningAnalyticsRuntime?.persistSession?.();
  runtime.contentCreationRuntime?.persistSession?.();
  runtime.curriculumAuthoringRuntime?.persistSession?.();
  runtime.interactionContractRuntime?.persistSession?.();
  runtime.inputCameraControlRuntime?.persistSession?.();
  runtime.educationalInspectionRuntime?.persistSession?.();
  runtime.accessibilityStateRecoveryRuntime?.persistSession?.();
  runtime.assetLoadingRuntime?.persistSession?.();
  runtime.adaptiveRenderingPerformanceRuntime?.destroy?.();
  runtime.animationTimelineIntegrationRuntime?.destroy?.();
  runtime.rendererCore?.destroy?.();
  runtime.timelineSynchronizationRuntime?.destroy?.();
  runtime.speechPlaybackRuntime?.destroy?.();
  runtime.adaptiveTeachingRuntime?.destroy?.();
  runtime.aiTeacherRuntime?.destroy?.();
  runtime.assessmentRuntime?.destroy?.();
  runtime.learningAnalyticsRuntime?.destroy?.();
  runtime.contentCreationRuntime?.destroy?.();
  runtime.curriculumAuthoringRuntime?.destroy?.();
  runtime.interactionContractRuntime?.destroy?.();
  runtime.inputCameraControlRuntime?.destroy?.();
  runtime.educationalInspectionRuntime?.destroy?.();
  runtime.accessibilityStateRecoveryRuntime?.destroy?.();
  runtime.assetLoadingRuntime?.destroy?.();
  runtime.narrationSynchronizationRuntime?.destroy?.();
  runtime.sceneEventRuntime?.destroy?.();
  runtime.stateManager.destroyAll();
  runtime.registry.destroy();
  runtime.graph.nodes.clear();
  runtime.graph.edges = [];
  return runtime;
}

export function reloadScene(sceneJson = {}) {
  destroyScene();
  return loadScene(sceneJson);
}

export function resetScene() {
  const runtime = ensureRuntime();
  runtime.timelineSynchronizationRuntime?.synchronize?.('reset-before-state-manager');
  runtime.speechPlaybackRuntime?.seek?.(0);
  runtime.adaptiveTeachingRuntime?.synchronize?.('reset');
  runtime.aiTeacherRuntime?.synchronize?.('reset');
  runtime.assessmentRuntime?.synchronize?.('reset');
  runtime.learningAnalyticsRuntime?.synchronize?.('reset');
  runtime.contentCreationRuntime?.synchronize?.('reset');
  runtime.curriculumAuthoringRuntime?.synchronize?.('reset');
  runtime.interactionContractRuntime?.synchronize?.('reset');
  runtime.inputCameraControlRuntime?.synchronize?.('reset');
  runtime.educationalInspectionRuntime?.synchronize?.('reset');
  runtime.accessibilityStateRecoveryRuntime?.synchronize?.('reset');
  runtime.narrationSynchronizationRuntime?.reset?.();
  runtime.sceneEventRuntime?.reset?.();
  runtime.adaptiveRenderingPerformanceRuntime?.reset?.();
  runtime.animationTimelineIntegrationRuntime?.reset?.();
  runtime.rendererCore?.reset?.();
  runtime.rendererCore?.build?.({
    runtimeGraph: runtime.graph?.toJSON?.() || { nodes: [], edges: [] }
  });
  runtime.stateManager.resetAll();
  runtime.stateManager.initializeAll();
  runtime.adaptiveRenderingPerformanceRuntime?.synchronize?.('reset');
  runtime.animationTimelineIntegrationRuntime?.synchronize?.('reset');
  runtime.rendererCore?.synchronize?.('reset');
  runtime.timelineSynchronizationRuntime?.synchronize?.('reset-after-state-manager');
  return runtime;
}

export function pauseScene() {
  const runtime = ensureRuntime();
  runtime.adaptiveRenderingPerformanceRuntime?.markInterrupted?.('scene-runtime-paused');
  runtime.animationTimelineIntegrationRuntime?.pause?.('scene-runtime');
  runtime.rendererCore?.pause?.('scene-runtime');
  runtime.timelineSynchronizationRuntime?.pause?.('scene-runtime');
  runtime.speechPlaybackRuntime?.pause?.('scene-runtime');
  runtime.adaptiveTeachingRuntime?.markInterrupted?.('scene-paused');
  runtime.aiTeacherRuntime?.markInterrupted?.('scene-paused');
  runtime.assessmentRuntime?.markInterrupted?.('scene-paused');
  runtime.learningAnalyticsRuntime?.markInterrupted?.('scene-paused');
  runtime.contentCreationRuntime?.markInterrupted?.('scene-paused');
  runtime.curriculumAuthoringRuntime?.markInterrupted?.('scene-paused');
  runtime.interactionContractRuntime?.handleExternalTimelineMutation?.('pause', { source: 'scene-runtime' });
  runtime.inputCameraControlRuntime?.handleExternalTimelineMutation?.('pause', { source: 'scene-runtime' });
  runtime.educationalInspectionRuntime?.handleExternalTimelineMutation?.('pause', { source: 'scene-runtime' });
  runtime.accessibilityStateRecoveryRuntime?.handleExternalTimelineMutation?.('pause', { source: 'scene-runtime' });
  runtime.assetLoadingRuntime?.handleExternalTimelineMutation?.('pause', { source: 'scene-runtime' });
  runtime.narrationSynchronizationRuntime?.pause?.('scene-runtime');
  runtime.stateManager.pauseAll();
  runtime.adaptiveRenderingPerformanceRuntime?.synchronize?.('pause-scene-state-manager');
  runtime.animationTimelineIntegrationRuntime?.synchronize?.('pause-scene-state-manager');
  runtime.rendererCore?.synchronize?.('pause-scene-state-manager');
  runtime.timelineSynchronizationRuntime?.synchronize?.('pause-scene-state-manager');
  return runtime;
}

export function resumeScene() {
  const runtime = ensureRuntime();
  runtime.adaptiveRenderingPerformanceRuntime?.continueSession?.(runtime?.timelineSynchronizationRuntime?.getSharedState?.()?.playback?.checkpointId || null);
  runtime.animationTimelineIntegrationRuntime?.resume?.('scene-runtime');
  runtime.rendererCore?.resume?.('scene-runtime');
  runtime.timelineSynchronizationRuntime?.resume?.('scene-runtime');
  runtime.speechPlaybackRuntime?.resume?.('scene-runtime');
  runtime.adaptiveTeachingRuntime?.synchronize?.('scene-resumed');
  runtime.aiTeacherRuntime?.handleExternalTimelineMutation?.('resume', { source: 'scene-runtime' });
  runtime.assessmentRuntime?.handleExternalTimelineMutation?.('resume', { source: 'scene-runtime' });
  runtime.learningAnalyticsRuntime?.handleExternalTimelineMutation?.('resume', { source: 'scene-runtime' });
  runtime.contentCreationRuntime?.handleExternalTimelineMutation?.('resume', { source: 'scene-runtime' });
  runtime.curriculumAuthoringRuntime?.handleExternalTimelineMutation?.('resume', { source: 'scene-runtime' });
  runtime.interactionContractRuntime?.handleExternalTimelineMutation?.('resume', { source: 'scene-runtime' });
  runtime.inputCameraControlRuntime?.handleExternalTimelineMutation?.('resume', { source: 'scene-runtime' });
  runtime.educationalInspectionRuntime?.handleExternalTimelineMutation?.('resume', { source: 'scene-runtime' });
  runtime.accessibilityStateRecoveryRuntime?.handleExternalTimelineMutation?.('resume', { source: 'scene-runtime' });
  runtime.assetLoadingRuntime?.handleExternalTimelineMutation?.('resume', { source: 'scene-runtime' });
  runtime.narrationSynchronizationRuntime?.resume?.('scene-runtime');
  runtime.stateManager.resumeAll();
  runtime.adaptiveRenderingPerformanceRuntime?.synchronize?.('resume-scene-state-manager');
  runtime.animationTimelineIntegrationRuntime?.synchronize?.('resume-scene-state-manager');
  runtime.rendererCore?.synchronize?.('resume-scene-state-manager');
  runtime.timelineSynchronizationRuntime?.synchronize?.('resume-scene-state-manager');
  return runtime;
}

export function getActiveTimelineScheduler() {
  return ensureRuntime()?.timelineScheduler || null;
}

export function getActiveSceneEventRuntime() {
  return ensureRuntime()?.sceneEventRuntime || null;
}

export function getActiveTimelineSynchronizationRuntime() {
  return ensureRuntime()?.timelineSynchronizationRuntime || null;
}

export function getActiveSharedRuntimeState() {
  return ensureRuntime()?.timelineSynchronizationRuntime?.getSharedState?.() || null;
}

export function getActiveRuntimeScene() {
  return activeRuntime;
}

export function getActiveRendererCore() {
  return ensureRuntime()?.rendererCore || null;
}

export function getActiveAnimationTimelineIntegrationRuntime() {
  return ensureRuntime()?.animationTimelineIntegrationRuntime || null;
}

export function getActiveAdaptiveRenderingPerformanceRuntime() {
  return ensureRuntime()?.adaptiveRenderingPerformanceRuntime || null;
}

export function setEducationalObjectLifecycleManager(manager) {
  if (manager && typeof manager === 'object') {
    educationalObjectLifecycleManager = manager;
    return true;
  }
  educationalObjectLifecycleManager = null;
  return false;
}

export function getEducationalObjectLifecycleManager() {
  return educationalObjectLifecycleManager;
}
