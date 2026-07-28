import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const workspaceRoot = process.cwd();

async function readSource(relativePath) {
  const fullPath = path.join(workspaceRoot, relativePath);
  return fs.readFile(fullPath, 'utf8');
}

test('runtime canvas paths include SafeEnvironment, ThreeErrorBoundary, and WebGLContextManager', async () => {
  const targets = [
    'src/components/3d/SceneCanvas.jsx',
    'src/components/AnimatedHeroScene.jsx',
    'src/components/Interactive3DModel.jsx',
    'src/components/Model3DViewer.jsx'
  ];

  for (const filePath of targets) {
    const source = await readSource(filePath);
    assert.equal(source.includes('SafeEnvironment'), true, `${filePath} must include SafeEnvironment`);
    assert.equal(source.includes('ThreeErrorBoundary'), true, `${filePath} must include ThreeErrorBoundary`);
    assert.equal(source.includes('WebGLContextManager'), true, `${filePath} must include WebGLContextManager`);
    assert.equal(source.includes('getSafeCanvasProps'), true, `${filePath} must use safe canvas defaults`);
  }
});

test('scene viewer uses stable safe canvas controls and runtime pause bridge', async () => {
  const source = await readSource('src/components/3d/SceneViewer.jsx');

  assert.equal(source.includes('getSafeCanvasProps({ animated: shouldAnimate })'), true);
  assert.equal(source.includes('onRuntimePauseChange?.(shouldPause);'), true);
  assert.equal(source.includes('dpr: [1, 1.5]'), false, 'SceneViewer should source canvas safety from helper, not duplicate literals');
});

test('webgl context manager handles context events, visibility pause/resume, and cleanup', async () => {
  const source = await readSource('src/components/three/WebGLContextManager.jsx');

  assert.equal(source.includes('event.preventDefault();'), true);
  assert.equal(source.includes("canvas.addEventListener('webglcontextlost'"), true);
  assert.equal(source.includes("canvas.addEventListener('webglcontextrestored'"), true);
  assert.equal(source.includes("canvas.removeEventListener('webglcontextlost'"), true);
  assert.equal(source.includes("canvas.removeEventListener('webglcontextrestored'"), true);
  assert.equal(source.includes("document.addEventListener('visibilitychange'"), true);
  assert.equal(source.includes("document.removeEventListener('visibilitychange'"), true);
});

test('learning runtimes preserve timeline progression with runtime pause callbacks', async () => {
  const learning3d = await readSource('src/pages/Learning3D.jsx');
  const interactiveRuntime = await readSource('src/components/academy/Interactive3DLessonRuntime.jsx');

  assert.equal(learning3d.includes('onRuntimePauseChange={handleRuntimePauseChange}'), true);
  assert.equal(learning3d.includes('isPlaybackActive={isTimelinePlaying && !animationPaused && !pausedByLearner && !runtimePaused}'), true);
  assert.equal(interactiveRuntime.includes('onRuntimePauseChange={handleRuntimePauseChange}'), true);
  assert.equal(interactiveRuntime.includes('isPlaybackActive={isPlaying && !runtimePaused}'), true);
});

test('unsupported 3D mode falls back to 2D first in runtime flows', async () => {
  const learning3d = await readSource('src/pages/Learning3D.jsx');
  const interactiveRuntime = await readSource('src/components/academy/Interactive3DLessonRuntime.jsx');

  assert.equal(learning3d.includes("fallbackType: requestedMode === 'interactive-2d' ? 'diagram' : ''"), true);
  assert.equal(interactiveRuntime.includes("fallbackType: requestedMode === 'interactive-2d' ? 'diagram' : ''"), true);
});
