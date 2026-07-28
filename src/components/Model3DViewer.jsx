import { Canvas } from '@react-three/fiber';
import { OrbitControls, Sphere, MeshDistortMaterial } from '@react-three/drei';
import { useCallback, useMemo, useState } from 'react';
import SafeEnvironment from './three/SafeEnvironment';
import ThreeErrorBoundary from './three/ThreeErrorBoundary';
import WebGLContextManager from './three/WebGLContextManager';
import { resolveEnvironmentAsset } from '../config/threeAssets.js';
import {
  createWebGLLifecycleState,
  getSafeCanvasProps,
  reduceWebGLLifecycle,
  shouldPauseForVisibility
} from '../utils/threeRuntimeSafety.js';

export default function Model3DViewer() {
  const [lifecycleState, setLifecycleState] = useState(createWebGLLifecycleState);
  const shouldPause = lifecycleState.paused || lifecycleState.restoring;
  const canvasProps = useMemo(() => getSafeCanvasProps({ animated: !shouldPause }), [shouldPause]);
  const localEnvironmentHdr = useMemo(() => resolveEnvironmentAsset('studio'), []);

  const handleContextLost = useCallback(() => {
    setLifecycleState((state) => reduceWebGLLifecycle(state, { type: 'context-lost' }));
  }, []);

  const handleContextRestored = useCallback(() => {
    setLifecycleState((state) => reduceWebGLLifecycle(state, { type: 'context-restored' }));
  }, []);

  const handleVisibilityPause = useCallback(() => {
    if (!shouldPauseForVisibility(document.hidden)) return;
    setLifecycleState((state) => reduceWebGLLifecycle(state, { type: 'pause' }));
  }, []);

  const handleVisibilityResume = useCallback(() => {
    if (shouldPauseForVisibility(document.hidden)) return;
    setLifecycleState((state) => reduceWebGLLifecycle(state, { type: 'resume' }));
  }, []);

  return (
    <ThreeErrorBoundary>
      <Canvas {...canvasProps} camera={{ ...canvasProps.camera, position: [0, 0, 5], fov: 45 }}>
        <WebGLContextManager
          onContextLost={handleContextLost}
          onContextRestored={handleContextRestored}
          pauseForVisibility={handleVisibilityPause}
          resumeForVisibility={handleVisibilityResume}
        />
        <ambientLight intensity={0.5} />
        <directionalLight position={[2, 2, 2]} intensity={2} color="#6366f1" />
        <directionalLight position={[-2, -2, -2]} intensity={1.5} color="#a855f7" />
        <SafeEnvironment localHdr={localEnvironmentHdr} enabled={!shouldPause} />

        <Sphere visible args={[1, 100, 200]} scale={1.5}>
          <MeshDistortMaterial color="#4f46e5" attach="material" distort={0.4} speed={2} roughness={0.2} metalness={0.8} />
        </Sphere>

        <OrbitControls enableZoom autoRotate={!shouldPause} autoRotateSpeed={1.5} />
      </Canvas>
    </ThreeErrorBoundary>
  );
}
