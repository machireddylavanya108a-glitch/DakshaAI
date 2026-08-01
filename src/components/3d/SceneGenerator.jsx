import { composeSceneFromPlan } from './SceneComposer';
import { planSceneFromLesson } from './ScenePlanner';
import { generateUniversalScene } from '../../scene-generator/index.js';

export async function generateAutomaticScene({ content = '', sourceType = 'typed-topic', lessonContext = '' } = {}) {
  const plan = planSceneFromLesson({ content, sourceType, lessonContext });
  const generated = await generateUniversalScene({
    lessonId: plan.sceneTitle,
    lesson: {
      content,
      lessonContext
    },
    title: plan.sceneTitle,
    topic: plan.subject,
    classification: plan.classification,
    lessonSteps: plan.timeline,
    learningGoals: plan.assessment?.tasks || [],
    keyConcepts: plan.entities?.map((entity) => entity.name) || [],
    sourceMetadata: {
      sourceType
    }
  }, {
    useCache: true,
    forceRegenerate: false,
    performanceProfile: 'balanced'
  });

  const scene = generated?.rendererPayload
    ? {
        title: generated.scene?.title || plan.sceneTitle,
        category: generated.scene?.subject || plan.subject,
        supports3D: true,
        fallbackType: '3d',
        summary: generated.scene?.summary || plan.summary,
        objects: generated.rendererPayload.objects,
        labels: generated.rendererPayload.labels.map((item) => item.text),
        hotspots: generated.rendererPayload.hotspots,
        timeline: generated.rendererPayload.timeline,
        cameraCues: plan.cameraCues,
        animationTargets: plan.animationTargets,
        simulationMode: plan.simulationMode,
        assessment: plan.assessment,
        practiceMode: plan.practiceMode,
        syncCues: plan.syncCues,
        reusableAssets: generated.rendererPayload.models
          .map((item) => item?.assetRef?.registryAssetId || item.assetId || null)
          .filter(Boolean),
        runtimeSceneGraph: generated.runtimeGraph,
        diagnostics: generated.diagnostics
      }
    : composeSceneFromPlan(plan);

  return {
    id: `scene_${Date.now()}`,
    createdAt: new Date().toISOString(),
    sourceType,
    plan,
    scene,
    runtimeScene: generated?.runtimeScene || null,
    runtimeGraph: generated?.runtimeGraph || null,
    rendererPayload: generated?.rendererPayload || null,
    generationStatus: generated?.status || 'success'
  };
}
