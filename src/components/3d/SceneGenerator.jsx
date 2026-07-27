import { composeSceneFromPlan } from './SceneComposer';
import { planSceneFromLesson } from './ScenePlanner';

export async function generateAutomaticScene({ content = '', sourceType = 'typed-topic', lessonContext = '' } = {}) {
  const plan = planSceneFromLesson({ content, sourceType, lessonContext });
  const scene = composeSceneFromPlan(plan);

  return {
    id: `scene_${Date.now()}`,
    createdAt: new Date().toISOString(),
    sourceType,
    plan,
    scene
  };
}
