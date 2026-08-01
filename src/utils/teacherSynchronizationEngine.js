import { buildUniversalNarrationPackage } from '../narration/index.js';

function normalizeText(value = '') {
  return String(value || '').trim();
}

function pickPrimaryTarget(scene = {}, narrationPackage = {}) {
  const segmentTarget = narrationPackage?.segments?.[0]?.relatedSceneObjectIds?.[0] || null;
  if (segmentTarget) return String(segmentTarget);

  const firstHotspot = scene?.hotspots?.[0]?.id || scene?.hotspots?.[0]?.label;
  if (firstHotspot) return String(firstHotspot);

  const firstModel = scene?.models?.[0]?.id || scene?.models?.[0]?.label;
  if (firstModel) return String(firstModel);

  return 'focus-element';
}

function pickEffect(narrationPackage = {}, scene = {}) {
  const hasInteractionCue = (narrationPackage?.cues?.all || []).some((cue) => cue.type === 'interaction-point');
  if (hasInteractionCue) return 'interaction-highlight';

  if ((scene?.animations || []).length > 0) return 'highlight';
  return 'focus-pulse';
}

export function buildTeacherSynchronizationPlan({ explanation = '', topic = '', scene = {} } = {}) {
  const narrationPackage = buildUniversalNarrationPackage({
    scene,
    lesson: explanation,
    topic,
    narration: scene?.narration || {}
  });

  const target = pickPrimaryTarget(scene, narrationPackage);
  const effect = pickEffect(narrationPackage, scene);
  const primarySegment = narrationPackage.segments[0] || null;
  const primaryCue = narrationPackage.cues.runtimeGraph[0] || narrationPackage.cues.all[0] || null;

  const steps = [
    {
      id: 'sync-camera',
      type: 'camera',
      action: 'Move camera to focus on the highlighted concept',
      target,
      durationMs: primarySegment?.durationMs || 1200,
      segmentId: primarySegment?.id || null,
      cueId: primaryCue?.id || null
    },
    {
      id: 'sync-highlight',
      type: 'highlight',
      action: 'Highlight the relevant structure or object',
      target,
      durationMs: 1000,
      segmentId: primarySegment?.id || null,
      cueId: narrationPackage.cues.sceneGraph[0]?.id || null
    },
    {
      id: 'sync-effect',
      type: 'effect',
      action: 'Show the related animation or flow effect',
      target,
      effect,
      durationMs: 1400,
      segmentId: primarySegment?.id || null,
      cueId: narrationPackage.cues.timeline[0]?.id || null
    },
    {
      id: 'sync-explain',
      type: 'explain',
      action: 'Explain the concept in the teacher voice and on the whiteboard',
      target,
      explanation: normalizeText(explanation) || primarySegment?.text || `This is ${target}.`,
      durationMs: primarySegment?.durationMs || 2200,
      segmentId: primarySegment?.id || null,
      cueId: primaryCue?.id || null
    },
    {
      id: 'sync-continue',
      type: 'continue',
      action: 'Continue the lesson after the explanation completes',
      target,
      durationMs: 800,
      segmentId: narrationPackage.segments.at(-1)?.id || null,
      cueId: narrationPackage.cues.runtimeGraph.at(-1)?.id || null
    }
  ];

  return {
    topic: normalizeText(topic) || 'lesson',
    target,
    explanation: normalizeText(explanation) || primarySegment?.text || 'Explain the current concept.',
    currentAction: steps[0],
    steps,
    narrationSegments: narrationPackage.segments,
    narrationCues: narrationPackage.cues,
    sceneSummary: {
      hotspotCount: (scene?.hotspots || []).length,
      modelCount: (scene?.models || []).length,
      animationCount: (scene?.animations || []).length,
      narrationSegmentCount: narrationPackage.summary.segmentCount,
      narrationCueCount: narrationPackage.summary.cueCount
    }
  };
}
