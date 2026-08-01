export const SUPPORTED_INPUT_DEVICE_TYPES = [
  'mouse',
  'touch',
  'keyboard',
  'pen',
  'stylus',
  'trackpad',
  'gamepad'
];

export const SUPPORTED_CAMERA_MODES = [
  'orbit',
  'pan',
  'zoom',
  'rotate',
  'focus-object',
  'reset-camera',
  'fit-scene',
  'first-person',
  'free-camera',
  'presentation-mode'
];

export const DEFAULT_INPUT_CAMERA_RUNTIME_CONFIG = {
  persistenceKey: 'daksha.input.camera.runtime.v1',
  maxInputHistory: 500,
  maxRuntimeEvents: 500,
  maxWarnings: 200,
  smoothTransitionDurationMs: 800,
  constraints: {
    minZoom: 0.3,
    maxZoom: 5,
    minDistance: 1,
    maxDistance: 40,
    minPolarAngle: 0.1,
    maxPolarAngle: 3.0,
    minX: -100,
    maxX: 100,
    minY: -100,
    maxY: 100,
    minZ: -100,
    maxZ: 100
  },
  modeProfiles: {
    orbit: {
      movementSpeed: 1,
      rotationSpeed: 1,
      zoomSpeed: 1,
      panSpeed: 1,
      damping: 0.1
    },
    pan: {
      movementSpeed: 1,
      rotationSpeed: 0.3,
      zoomSpeed: 0.8,
      panSpeed: 1.2,
      damping: 0.08
    },
    zoom: {
      movementSpeed: 0.7,
      rotationSpeed: 0.5,
      zoomSpeed: 1.25,
      panSpeed: 0.8,
      damping: 0.12
    },
    rotate: {
      movementSpeed: 0.9,
      rotationSpeed: 1.2,
      zoomSpeed: 0.8,
      panSpeed: 0.8,
      damping: 0.09
    },
    'focus-object': {
      movementSpeed: 1,
      rotationSpeed: 0.7,
      zoomSpeed: 1,
      panSpeed: 0.7,
      damping: 0.14
    },
    'reset-camera': {
      movementSpeed: 1,
      rotationSpeed: 1,
      zoomSpeed: 1,
      panSpeed: 1,
      damping: 0.15
    },
    'fit-scene': {
      movementSpeed: 1,
      rotationSpeed: 0.7,
      zoomSpeed: 1,
      panSpeed: 0.8,
      damping: 0.14
    },
    'first-person': {
      movementSpeed: 1.25,
      rotationSpeed: 1.1,
      zoomSpeed: 0.6,
      panSpeed: 0.4,
      damping: 0.05
    },
    'free-camera': {
      movementSpeed: 1.2,
      rotationSpeed: 1.2,
      zoomSpeed: 1.1,
      panSpeed: 1.1,
      damping: 0.06
    },
    'presentation-mode': {
      movementSpeed: 0.8,
      rotationSpeed: 0.7,
      zoomSpeed: 0.9,
      panSpeed: 0.7,
      damping: 0.2
    }
  }
};

export function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function asArray(value) {
  return Array.isArray(value) ? value : [];
}

export function toFiniteNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function clamp(value, minimum = 0, maximum = 1) {
  return Math.min(Math.max(toFiniteNumber(value, minimum), minimum), maximum);
}

function toKebab(value = '') {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function normalizeInputDeviceType(input = 'unknown-device') {
  const normalized = toKebab(input || 'unknown-device');

  if (!normalized) {
    return {
      type: 'unknown-device',
      known: false
    };
  }

  if (normalized === 'pointer' || normalized === 'mouse-pointer') {
    return {
      type: 'mouse',
      known: true
    };
  }

  if (normalized === 'touchscreen') {
    return {
      type: 'touch',
      known: true
    };
  }

  if (normalized === 'pen-stylus') {
    return {
      type: 'stylus',
      known: true
    };
  }

  return {
    type: normalized,
    known: SUPPORTED_INPUT_DEVICE_TYPES.includes(normalized)
  };
}

export function normalizeCameraMode(input = 'orbit') {
  const normalized = toKebab(input || 'orbit');

  if (!normalized) {
    return {
      mode: 'orbit',
      known: true
    };
  }

  if (normalized === 'firstperson') {
    return {
      mode: 'first-person',
      known: true
    };
  }

  if (normalized === 'freecamera') {
    return {
      mode: 'free-camera',
      known: true
    };
  }

  if (normalized === 'presentation') {
    return {
      mode: 'presentation-mode',
      known: true
    };
  }

  if (normalized === 'focus' || normalized === 'focus-object-camera') {
    return {
      mode: 'focus-object',
      known: true
    };
  }

  if (normalized === 'reset') {
    return {
      mode: 'reset-camera',
      known: true
    };
  }

  if (normalized === 'fit') {
    return {
      mode: 'fit-scene',
      known: true
    };
  }

  return {
    mode: normalized,
    known: SUPPORTED_CAMERA_MODES.includes(normalized)
  };
}
