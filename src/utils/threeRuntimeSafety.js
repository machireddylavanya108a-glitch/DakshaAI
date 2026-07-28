export const VISUALIZATION_MODES = ['interactive-3d', 'interactive-2d', 'animated-whiteboard', 'static-concept-map', 'text-lesson'];

export function resolveVisualizationMode({ supports3D = false, fallbackType = '', hasWhiteboard = true, hasConceptMap = true } = {}) {
  if (supports3D) return VISUALIZATION_MODES[0];
  if (fallbackType === 'diagram') return VISUALIZATION_MODES[1];
  if (hasWhiteboard) return VISUALIZATION_MODES[2];
  if (hasConceptMap) return VISUALIZATION_MODES[3];
  return VISUALIZATION_MODES[4];
}

export function getNextVisualizationMode(mode = VISUALIZATION_MODES[0]) {
  const index = VISUALIZATION_MODES.indexOf(mode);
  if (index < 0) return VISUALIZATION_MODES[1];
  if (index >= VISUALIZATION_MODES.length - 1) return VISUALIZATION_MODES[VISUALIZATION_MODES.length - 1];
  return VISUALIZATION_MODES[index + 1];
}

export function createWebGLLifecycleState() {
  return {
    paused: false,
    restoring: false,
    incidents: 0
  };
}

export function reduceWebGLLifecycle(state, action) {
  const current = state || createWebGLLifecycleState();
  const type = action?.type;

  if (type === 'context-lost') {
    return {
      paused: true,
      restoring: true,
      incidents: current.incidents + 1
    };
  }

  if (type === 'context-restored') {
    return {
      paused: false,
      restoring: false,
      incidents: current.incidents
    };
  }

  if (type === 'pause') {
    return {
      ...current,
      paused: true
    };
  }

  if (type === 'resume') {
    return {
      ...current,
      paused: false
    };
  }

  return current;
}

export function getSafeCanvasProps({ animated = false } = {}) {
  return {
    dpr: [1, 1.5],
    frameloop: animated ? 'always' : 'demand',
    gl: {
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: false
    },
    camera: {
      position: [0, 2, 6],
      fov: 45,
      near: 0.1,
      far: 1000
    }
  };
}

export function shouldPauseForVisibility(hidden) {
  return Boolean(hidden);
}
