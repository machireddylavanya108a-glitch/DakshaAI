const GENERIC_CAMERA_MODES = ['orbit', 'zoom', 'pan', 'focus', 'dolly', 'track'];
const GENERIC_SCENE_EFFECTS = ['particles', 'highlight', 'depthFade', 'pulse'];

function getContentFingerprint(content = '') {
  const text = String(content || '').toLowerCase();
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = ((hash << 5) - hash + text.charCodeAt(index)) | 0;
  }
  return Math.abs(hash);
}

function chooseCameraMode(content = '', index = 0) {
  const fingerprint = getContentFingerprint(content);
  const modeIndex = (fingerprint + index) % GENERIC_CAMERA_MODES.length;
  return GENERIC_CAMERA_MODES[modeIndex] || 'orbit';
}

function chooseSceneEffects(content = '', index = 0) {
  const fingerprint = getContentFingerprint(content);
  const first = GENERIC_SCENE_EFFECTS[fingerprint % GENERIC_SCENE_EFFECTS.length];
  const second = GENERIC_SCENE_EFFECTS[(fingerprint + index + 1) % GENERIC_SCENE_EFFECTS.length];
  return [...new Set(['highlight', first, second])];
}

function deriveMotionSpeed(content = '', index = 0) {
  const fingerprint = getContentFingerprint(content);
  const base = 0.9 + (fingerprint % 5) * 0.08;
  return Number((base + index * 0.04).toFixed(2));
}

export function buildAnimationPlan(content = '', steps = []) {
  return (steps.length ? steps : [{ id: 'step-1', title: 'Auto scene' }]).map((step, index) => ({
    id: step.id || `anim-${index + 1}`,
    title: step.title || `Animation ${index + 1}`,
    target: step.target || `part-${index + 1}`,
    cameraMode: chooseCameraMode(content, index),
    sceneEffects: chooseSceneEffects(content, index),
    motionSpeed: deriveMotionSpeed(content, index),
    autoLabels: true,
    pointerMode: getContentFingerprint(content) % 2 === 0 ? 'pointer' : 'laser',
    durationMs: 1800 + index * 350,
    replay: true,
    slowMotion: index === 0
  }));
}

export function buildAutoAnimationState(content = '', state = {}) {
  const normalized = String(content || '').toLowerCase();
  const fingerprint = getContentFingerprint(normalized);
  const dynamicEffects = chooseSceneEffects(normalized, 0);

  return {
    cameraMode: chooseCameraMode(normalized, 0),
    highlightMode: 'glow',
    sceneEffects: [...new Set([...(state.sceneEffects || []), ...dynamicEffects])],
    motionSpeed: deriveMotionSpeed(normalized, 0),
    autoRotate: true,
    exploded: /(explode|breakdown|layers)/.test(normalized),
    crossSection: /(cross\s*section|slice|inside view)/.test(normalized),
    xRay: /(x-ray|xray|transparent view)/.test(normalized),
    transparency: /(transparent|inside|interior)/.test(normalized),
    pointerMode: fingerprint % 2 === 0 ? 'pointer' : 'laser',
    showAnimatedLabels: true,
    slowMotion: /(slow|detail|step by step)/.test(normalized),
    replay: true,
    timelineEnabled: true,
    animationTimelineEnabled: true,
    walkThrough: /(walk|journey|tour|navigate)/.test(normalized)
  };
}
