function normalizeText(value = '') {
  return String(value || '').trim().toLowerCase();
}

function inferTarget(explanation = '', scene = {}) {
  const normalized = normalizeText(explanation);
  const hotspotLabels = (scene?.hotspots || []).map((item) => String(item?.label || '')).filter(Boolean);
  const modelLabels = (scene?.models || []).map((item) => String(item?.label || '')).filter(Boolean);
  const candidates = [...hotspotLabels, ...modelLabels];

  if (normalized.includes('left ventricle')) return 'left ventricle';
  if (normalized.includes('right ventricle')) return 'right ventricle';
  if (normalized.includes('atrium')) return 'atrium';
  const match = candidates.find((candidate) => normalized.includes(normalizeText(candidate)));
  return normalizeText(match || 'focus element') || 'focus element';
}

function extractEffect(explanation = '', scene = {}) {
  if (/blood|flow|circulation/.test(normalizeText(explanation))) {
    return 'blood-flow';
  }
  if ((scene?.animations || []).length > 0) return 'highlight';
  return 'pulse';
}

export function buildTeacherSynchronizationPlan({ explanation = '', topic = '', scene = {} } = {}) {
  const target = inferTarget(explanation, scene);
  const effect = extractEffect(explanation, scene);
  const steps = [
    {
      id: 'sync-camera',
      type: 'camera',
      action: 'Move camera to focus on the highlighted concept',
      target,
      durationMs: 1200
    },
    {
      id: 'sync-highlight',
      type: 'highlight',
      action: 'Highlight the relevant structure or object',
      target,
      durationMs: 1000
    },
    {
      id: 'sync-effect',
      type: 'effect',
      action: 'Show the related animation or flow effect',
      target,
      effect,
      durationMs: 1400
    },
    {
      id: 'sync-explain',
      type: 'explain',
      action: 'Explain the concept in the teacher voice and on the whiteboard',
      target,
      explanation: String(explanation || '').trim() || `This is ${target}.`,
      durationMs: 2200
    },
    {
      id: 'sync-continue',
      type: 'continue',
      action: 'Continue the lesson after the explanation completes',
      target,
      durationMs: 800
    }
  ];

  return {
    topic: String(topic || 'lesson').trim() || 'lesson',
    target,
    explanation: String(explanation || '').trim() || 'Explain the current concept.',
    currentAction: steps[0],
    steps,
    sceneSummary: {
      hotspotCount: (scene?.hotspots || []).length,
      modelCount: (scene?.models || []).length,
      animationCount: (scene?.animations || []).length
    }
  };
}
