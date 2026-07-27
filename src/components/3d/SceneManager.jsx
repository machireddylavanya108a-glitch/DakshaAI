import { useEffect, useState } from 'react';
import { generateAutomaticScene } from './SceneGenerator';
import { getSceneCacheKey, readSceneCache, writeSceneCache } from './SceneCache';
import {
  saveAutomaticSceneBundle,
  saveCameraPreset,
  saveEnvironmentPreset,
  saveLessonAnimations,
  saveSceneHistory,
  saveSceneTimeline
} from '../../services/firestoreService';

export default function SceneManager({ content = '', sourceType = 'typed-topic', lessonContext = '', userId, onSceneReady, onStatusChange }) {
  const [status, setStatus] = useState('idle');

  useEffect(() => {
    const text = String(content || '').trim();
    if (!text) return;

    let cancelled = false;

    const generate = async () => {
      setStatus('generating');
      onStatusChange?.('generating');

      const cacheKey = getSceneCacheKey(text, sourceType);
      const cached = readSceneCache(cacheKey);
      if (cached) {
        if (!cancelled) {
          onSceneReady?.(cached.scene, cached.plan, cached.id);
          setStatus('cached');
          onStatusChange?.('cached');
        }
        return;
      }

      try {
        const generated = await generateAutomaticScene({ content: text, sourceType, lessonContext });
        writeSceneCache(cacheKey, generated);

        if (!cancelled) {
          onSceneReady?.(generated.scene, generated.plan, generated.id);
          setStatus('ready');
          onStatusChange?.('ready');
        }

        if (userId) {
          await saveAutomaticSceneBundle(userId, {
            sceneId: generated.id,
            sourceType,
            lessonContent: text,
            scene: generated.scene,
            plan: generated.plan
          });

          await Promise.all([
            saveSceneTimeline(userId, generated.id, generated.scene?.timeline || generated.plan?.timeline || []),
            saveLessonAnimations(userId, generated.id, generated.plan?.timeline?.map((step) => ({
              id: step.id,
              target: step.target,
              animation: step.animation,
              durationMs: step.durationMs
            })) || []),
            saveCameraPreset(userId, generated.id, {
              mode: 'orbit',
              cues: generated.scene?.cameraCues || generated.plan?.cameraCues || []
            }),
            saveEnvironmentPreset(userId, generated.id, {
              subject: generated.plan?.subject || 'general',
              suggestion: generated.plan?.subject || 'classroom'
            }),
            saveSceneHistory(userId, {
              sceneId: generated.id,
              type: 'scene-generated',
              sourceType,
              lessonTopic: text.slice(0, 140)
            })
          ]);
        }
      } catch (error) {
        console.error('Scene generation error:', error);
        if (!cancelled) {
          setStatus('error');
          onStatusChange?.('error');
        }
      }
    };

    generate();

    return () => {
      cancelled = true;
    };
  }, [content, sourceType, lessonContext, userId, onSceneReady, onStatusChange]);

  return <div className="sr-only" aria-live="polite">Scene status: {status}</div>;
}
