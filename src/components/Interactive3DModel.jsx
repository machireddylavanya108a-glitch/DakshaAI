import { Canvas } from '@react-three/fiber';
import { OrbitControls, Sphere } from '@react-three/drei';
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

function Planet({ position, color, scale, name, onClick, isSelected }) {
  return (
    <Sphere position={position} scale={scale} onClick={(e) => { e.stopPropagation(); onClick(name); }}>
      <meshStandardMaterial color={isSelected ? '#ffffff' : color} emissive={isSelected ? '#6366f1' : '#000000'} emissiveIntensity={isSelected ? 0.5 : 0} />
    </Sphere>
  );
}

export default function Interactive3DModel({ selectedPart, onSelectPart }) {
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
      <Canvas {...canvasProps} camera={{ ...canvasProps.camera, position: [0, 5, 10], fov: 50 }}>
        <WebGLContextManager
          onContextLost={handleContextLost}
          onContextRestored={handleContextRestored}
          pauseForVisibility={handleVisibilityPause}
          resumeForVisibility={handleVisibilityResume}
        />
        <ambientLight intensity={0.3} />
        <pointLight position={[0, 0, 0]} intensity={2} distance={100} decay={0} />
        <SafeEnvironment localHdr={localEnvironmentHdr} enabled={!shouldPause} />

        <Planet position={[0, 0, 0]} color="#ffdd00" scale={1.5} name="The Sun" onClick={onSelectPart} isSelected={selectedPart === 'The Sun'} />
        <Planet position={[3, 0, 0]} color="#8c7853" scale={0.3} name="Mercury" onClick={onSelectPart} isSelected={selectedPart === 'Mercury'} />
        <Planet position={[4.5, 0, 0]} color="#e39e54" scale={0.5} name="Venus" onClick={onSelectPart} isSelected={selectedPart === 'Venus'} />
        <Planet position={[6, 0, 0]} color="#4f46e5" scale={0.6} name="Earth" onClick={onSelectPart} isSelected={selectedPart === 'Earth'} />
        <Planet position={[7.5, 0, 0]} color="#cc4444" scale={0.4} name="Mars" onClick={onSelectPart} isSelected={selectedPart === 'Mars'} />

        <OrbitControls enablePan={false} minDistance={5} maxDistance={20} />
      </Canvas>
    </ThreeErrorBoundary>
  );
}
