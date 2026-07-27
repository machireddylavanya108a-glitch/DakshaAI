const CAMERA_MODES = [
  'orbit',
  'follow',
  'firstPerson',
  'thirdPerson',
  'freeCamera',
  'focusCamera',
  'topView',
  'sideView',
  'sectionView',
  'xRayView',
  'explodedView'
];

export function getSupportedCameraModes() {
  return CAMERA_MODES;
}

function findTarget(scene, selectedPart) {
  const objects = scene?.objects || [];
  if (!objects.length) return null;
  if (selectedPart) {
    const matched = objects.find((item) => item.label === selectedPart);
    if (matched) return matched;
  }
  return objects[0];
}

export function buildAutoFocusState({ scene, selectedPart, cameraMode = 'orbit' }) {
  const target = findTarget(scene, selectedPart);
  const position = target?.position || [0, 0, 0];

  if (cameraMode === 'topView') {
    return { targetLabel: target?.label || '', cameraPosition: [position[0], position[1] + 8, position[2] + 0.2], lookAt: position };
  }
  if (cameraMode === 'sideView') {
    return { targetLabel: target?.label || '', cameraPosition: [position[0] + 8, position[1] + 1.2, position[2]], lookAt: position };
  }
  if (cameraMode === 'firstPerson') {
    return { targetLabel: target?.label || '', cameraPosition: [position[0] + 0.3, position[1] + 0.6, position[2] + 0.3], lookAt: [position[0] + 2.5, position[1], position[2]] };
  }
  if (cameraMode === 'follow') {
    return { targetLabel: target?.label || '', cameraPosition: [position[0] - 2, position[1] + 1.6, position[2] + 2.2], lookAt: position };
  }
  if (cameraMode === 'focusCamera') {
    return { targetLabel: target?.label || '', cameraPosition: [position[0] + 1.2, position[1] + 1.1, position[2] + 2.4], lookAt: position };
  }

  return { targetLabel: target?.label || '', cameraPosition: [position[0] + 2.3, position[1] + 1.4, position[2] + 4.2], lookAt: position };
}

export default function AutoFocus({ cameraMode = 'orbit', selectedPart = '', scene, onCameraModeChange }) {
  const focus = buildAutoFocusState({ scene, selectedPart, cameraMode });

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-4">
      <p className="text-xs uppercase tracking-[0.28em] text-cyan-300">Camera Selector</p>
      <p className="mt-2 text-xs text-slate-400">Target: {focus.targetLabel || 'auto detect'}</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {CAMERA_MODES.map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => onCameraModeChange?.(mode)}
            className={`rounded-lg border px-2 py-1 text-xs ${mode === cameraMode ? 'border-cyan-400/40 bg-cyan-500/10 text-cyan-100' : 'border-slate-700 bg-slate-950/70 text-slate-200'}`}
          >
            {mode}
          </button>
        ))}
      </div>
    </div>
  );
}
