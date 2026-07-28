const DOMAIN_ANIMATION_RULES = {
  medicine: {
    cameraModes: ['orbit', 'zoom', 'fly-through', 'cross-section', 'x-ray'],
    sceneEffects: ['bloodFlow', 'particles', 'highlight'],
    motionSpeed: 1.1,
    autoLabels: true,
    pointerMode: 'laser'
  },
  engineering: {
    cameraModes: ['orbit', 'zoom', 'rotation', 'explode', 'walk-through'],
    sceneEffects: ['particles', 'highlight', 'laser'],
    motionSpeed: 1.2,
    autoLabels: true,
    pointerMode: 'pointer'
  },
  astronomy: {
    cameraModes: ['orbit', 'rotation', 'fly-through', 'zoom'],
    sceneEffects: ['particles', 'planetRotation', 'highlight'],
    motionSpeed: 0.95,
    autoLabels: true,
    pointerMode: 'pointer'
  },
  robotics: {
    cameraModes: ['orbit', 'zoom', 'walk-through', 'explode'],
    sceneEffects: ['particles', 'laser', 'highlight'],
    motionSpeed: 1.05,
    autoLabels: true,
    pointerMode: 'laser'
  },
  default: {
    cameraModes: ['orbit', 'zoom', 'rotation', 'highlight'],
    sceneEffects: ['particles', 'highlight'],
    motionSpeed: 1,
    autoLabels: true,
    pointerMode: 'pointer'
  }
};

function detectDomain(content = '') {
  const normalized = String(content || '').toLowerCase();
  if (/heart|surgery|blood|medical|organ|anatomy|patient/.test(normalized)) return 'medicine';
  if (/robot|automation|engine|gear|mechanical|assembly/.test(normalized)) return 'robotics';
  if (/planet|solar|star|orbit|galaxy|astronomy/.test(normalized)) return 'astronomy';
  if (/engineering|circuit|machine|system|design/.test(normalized)) return 'engineering';
  return 'default';
}

function chooseCameraMode(content = '', index = 0) {
  const domain = detectDomain(content);
  const modes = DOMAIN_ANIMATION_RULES[domain]?.cameraModes || DOMAIN_ANIMATION_RULES.default.cameraModes;
  return modes[index % modes.length] || 'orbit';
}

export function buildAnimationPlan(content = '', steps = []) {
  const domain = detectDomain(content);
  const rules = DOMAIN_ANIMATION_RULES[domain] || DOMAIN_ANIMATION_RULES.default;

  return (steps.length ? steps : [{ id: 'step-1', title: 'Auto scene' }]).map((step, index) => ({
    id: step.id || `anim-${index + 1}`,
    title: step.title || `Animation ${index + 1}`,
    target: step.target || `part-${index + 1}`,
    cameraMode: chooseCameraMode(content, index),
    sceneEffects: [...new Set([...rules.sceneEffects, index === 0 ? 'highlight' : ''])].filter(Boolean),
    motionSpeed: Number((rules.motionSpeed + (index * 0.05)).toFixed(2)),
    autoLabels: rules.autoLabels,
    pointerMode: rules.pointerMode,
    durationMs: 1800 + index * 350,
    replay: true,
    slowMotion: index === 0
  }));
}

export function buildAutoAnimationState(content = '', state = {}) {
  const domain = detectDomain(content);
  const rules = DOMAIN_ANIMATION_RULES[domain] || DOMAIN_ANIMATION_RULES.default;

  return {
    cameraMode: rules.cameraModes[0] || 'orbit',
    highlightMode: 'glow',
    sceneEffects: [...new Set([...(state.sceneEffects || []), ...rules.sceneEffects])],
    motionSpeed: rules.motionSpeed,
    autoRotate: true,
    exploded: /explode|surgery|assembly|robot/.test(String(content || '').toLowerCase()),
    crossSection: /cross|section|anatomy|heart/.test(String(content || '').toLowerCase()),
    xRay: /x-ray|xray|anatomy|medical|heart/.test(String(content || '').toLowerCase()),
    transparency: /blood|medical|organ/.test(String(content || '').toLowerCase()),
    pointerMode: rules.pointerMode,
    showAnimatedLabels: true,
    slowMotion: /slow|detail|surgery/.test(String(content || '').toLowerCase()),
    replay: true,
    timelineEnabled: true,
    animationTimelineEnabled: true,
    walkThrough: /walk|journey|tour/.test(String(content || '').toLowerCase())
  };
}
