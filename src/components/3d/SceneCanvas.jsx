import { Canvas } from '@react-three/fiber';
import { OrbitControls, Float } from '@react-three/drei';
import { Suspense, useCallback, useMemo, useState } from 'react';
import ModelViewer from './ModelViewer';
import Lighting from './Lighting';
import Loader3D from './Loader3D';
import SafeEnvironment from '../three/SafeEnvironment';
import ThreeErrorBoundary from '../three/ThreeErrorBoundary';
import WebGLContextManager from '../three/WebGLContextManager';
import { resolveEnvironmentAsset } from '../../config/threeAssets.js';
import {
  createWebGLLifecycleState,
  getSafeCanvasProps,
  reduceWebGLLifecycle,
  shouldPauseForVisibility
} from '../../utils/threeRuntimeSafety.js';

export default function SceneCanvas({ model, selectedPart, onSelectPart }) {
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
    <div className="h-[420px] overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/70 shadow-2xl shadow-slate-950/40">
      <ThreeErrorBoundary>
        <Canvas {...canvasProps} camera={{ ...canvasProps.camera, position: [0, 0, 8], fov: 45 }} shadows>
          <WebGLContextManager
            onContextLost={handleContextLost}
            onContextRestored={handleContextRestored}
            pauseForVisibility={handleVisibilityPause}
            resumeForVisibility={handleVisibilityResume}
          />
          <Suspense fallback={<Loader3D />}>
            <fog attach="fog" args={['#020617', 0, 20]} />
            <ambientLight intensity={0.5} />
            <Lighting />
            <SafeEnvironment localHdr={localEnvironmentHdr} enabled={!shouldPause} />
            <Float speed={1.6} rotationIntensity={0.25} floatIntensity={0.6}>
              <ModelViewer model={model} selectedPart={selectedPart} onSelectPart={onSelectPart} />
            </Float>
            <OrbitControls enablePan enableZoom enableRotate autoRotate={!shouldPause} />
          </Suspense>
        </Canvas>
      </ThreeErrorBoundary>
    </div>
  );
}
