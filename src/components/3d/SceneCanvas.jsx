import { Canvas } from '@react-three/fiber';
import { OrbitControls, Float } from '@react-three/drei';
import { Suspense } from 'react';
import ModelViewer from './ModelViewer';
import Lighting from './Lighting';
import Loader3D from './Loader3D';
import SafeEnvironment from '../three/SafeEnvironment';
import { resolveEnvironmentAsset } from '../../config/threeAssets.js';
import { getSafeCanvasProps } from '../../utils/threeRuntimeSafety.js';

export default function SceneCanvas({ model, selectedPart, onSelectPart }) {
  const canvasProps = getSafeCanvasProps({ animated: true });
  const localEnvironmentHdr = resolveEnvironmentAsset('studio');

  return (
    <div className="h-[420px] overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/70 shadow-2xl shadow-slate-950/40">
      <Canvas {...canvasProps} camera={{ ...canvasProps.camera, position: [0, 0, 8], fov: 45 }} shadows>
        <Suspense fallback={<Loader3D />}> 
          <fog attach="fog" args={['#020617', 0, 20]} />
          <ambientLight intensity={0.5} />
          <Lighting />
          <SafeEnvironment localHdr={localEnvironmentHdr} enabled />
          <Float speed={1.6} rotationIntensity={0.25} floatIntensity={0.6}>
            <ModelViewer model={model} selectedPart={selectedPart} onSelectPart={onSelectPart} />
          </Float>
          <OrbitControls enablePan enableZoom enableRotate autoRotate />
        </Suspense>
      </Canvas>
    </div>
  );
}
