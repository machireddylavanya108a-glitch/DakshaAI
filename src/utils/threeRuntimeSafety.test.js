import test from 'node:test';
import assert from 'node:assert/strict';
import {
  VISUALIZATION_MODES,
  createWebGLLifecycleState,
  getNextVisualizationMode,
  getSafeCanvasProps,
  reduceWebGLLifecycle,
  resolveVisualizationMode,
  shouldPauseForVisibility
} from './threeRuntimeSafety.js';

test('safe canvas defaults cap dpr and disable preserveDrawingBuffer', () => {
  const idle = getSafeCanvasProps({ animated: false });
  const active = getSafeCanvasProps({ animated: true });

  assert.deepEqual(idle.dpr, [1, 1.5]);
  assert.equal(idle.gl.preserveDrawingBuffer, false);
  assert.equal(idle.frameloop, 'demand');
  assert.equal(active.frameloop, 'always');
});

test('fallback hierarchy resolves from 3D to 2D to text lesson path', () => {
  const fallback2d = resolveVisualizationMode({ supports3D: false, fallbackType: 'diagram', hasWhiteboard: true, hasConceptMap: true });
  const fallbackWhiteboard = resolveVisualizationMode({ supports3D: false, fallbackType: '', hasWhiteboard: true, hasConceptMap: true });
  const fallbackMap = resolveVisualizationMode({ supports3D: false, fallbackType: '', hasWhiteboard: false, hasConceptMap: true });
  const fallbackText = resolveVisualizationMode({ supports3D: false, fallbackType: '', hasWhiteboard: false, hasConceptMap: false });

  assert.equal(fallback2d, 'interactive-2d');
  assert.equal(fallbackWhiteboard, 'animated-whiteboard');
  assert.equal(fallbackMap, 'static-concept-map');
  assert.equal(fallbackText, 'text-lesson');
  assert.deepEqual(VISUALIZATION_MODES, ['interactive-3d', 'interactive-2d', 'animated-whiteboard', 'static-concept-map', 'text-lesson']);
  assert.equal(getNextVisualizationMode('interactive-3d'), 'interactive-2d');
});

test('webgl lifecycle reducer pauses and restores without losing state shape', () => {
  const initial = createWebGLLifecycleState();
  const lost = reduceWebGLLifecycle(initial, { type: 'context-lost' });
  const resumed = reduceWebGLLifecycle(lost, { type: 'context-restored' });
  const paused = reduceWebGLLifecycle(resumed, { type: 'pause' });
  const unpaused = reduceWebGLLifecycle(paused, { type: 'resume' });

  assert.equal(initial.paused, false);
  assert.equal(lost.paused, true);
  assert.equal(lost.restoring, true);
  assert.equal(lost.incidents, 1);
  assert.equal(resumed.paused, false);
  assert.equal(resumed.restoring, false);
  assert.equal(resumed.incidents, 1);
  assert.equal(paused.paused, true);
  assert.equal(unpaused.paused, false);
});

test('visibility helper pauses when hidden', () => {
  assert.equal(shouldPauseForVisibility(true), true);
  assert.equal(shouldPauseForVisibility(false), false);
});
