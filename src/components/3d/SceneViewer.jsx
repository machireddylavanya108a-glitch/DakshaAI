import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, Html } from '@react-three/drei';
import { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { buildAutoFocusState } from './AutoFocus';
import { getHighlightPreset } from './ObjectHighlighter';

function PrimitiveShape({ label, color, position }) {
  const geometry = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);
  return (
    <mesh position={position} castShadow receiveShadow>
      <primitive object={geometry} attach="geometry" />
      <meshStandardMaterial color={color} roughness={0.5} metalness={0.1} />
      <Html position={[0, 1.2, 0]} center>{label}</Html>
    </mesh>
  );
}

export default function SceneViewer({
  scene,
  selectedPart,
  onSelectPart,
  autoRotate,
  exploded,
  crossSection,
  xRay,
  showLabels,
  hideInactive,
  measurementMode,
  motionSpeed = 1,
  onHotspot,
  cameraMode = 'orbit',
  highlightMode = 'none',
  environmentPreset = 'classroom',
  sceneEffects = [],
  activeTimelineStep = null,
  showDynamicLabels = true,
  lodLevel = 'high',
  performanceProfile = 'balanced',
  onCameraStateChange
}) {
  const [hovered, setHovered] = useState(null);
  const objects = useMemo(() => scene?.objects || [], [scene]);
  const activeObject = objects.find((item) => item.label === selectedPart);
  const focusState = useMemo(() => buildAutoFocusState({ scene, selectedPart, cameraMode }), [scene, selectedPart, cameraMode]);
  const highlightPreset = useMemo(() => getHighlightPreset(highlightMode), [highlightMode]);

  const sceneLighting = useMemo(() => {
    if (environmentPreset === 'hospital' || environmentPreset === 'laboratory' || environmentPreset === 'chemical-lab') {
      return { ambient: 0.82, directional: 1.35, point: 0.7, fogNear: 7, fogFar: 20 };
    }
    if (environmentPreset === 'solar-system') {
      return { ambient: 0.45, directional: 1.5, point: 0.95, fogNear: 10, fogFar: 28 };
    }
    if (environmentPreset === 'forest' || environmentPreset === 'ocean') {
      return { ambient: 0.6, directional: 1.15, point: 0.55, fogNear: 8, fogFar: 22 };
    }
    return { ambient: 0.7, directional: 1.2, point: 0.6, fogNear: 6, fogFar: 18 };
  }, [environmentPreset]);

  const maxObjects = useMemo(() => {
    if (lodLevel === 'low') return 6;
    if (lodLevel === 'medium') return 14;
    return 40;
  }, [lodLevel]);

  const viewObjects = useMemo(() => {
    let next = objects;
    if (hideInactive || highlightPreset.hideOthers) {
      next = selectedPart ? objects.filter((item) => item.label === selectedPart) : objects;
    }
    if (next.length > maxObjects) {
      next = next.slice(0, maxObjects);
    }
    return next;
  }, [objects, hideInactive, selectedPart, highlightPreset.hideOthers, maxObjects]);

  const cameraPosition = focusState.cameraPosition || (activeObject?.position
    ? [activeObject.position[0] + 2.3, activeObject.position[1] + 1.4, activeObject.position[2] + 4.2]
    : [0, 2, 6]);

  const distance = activeObject
    ? Math.sqrt((activeObject.position?.[0] || 0) ** 2 + (activeObject.position?.[1] || 0) ** 2 + (activeObject.position?.[2] || 0) ** 2).toFixed(2)
    : '0.00';

  const showParticles = sceneEffects.includes('particles') || sceneEffects.includes('bloodFlow') || sceneEffects.includes('waterFlow');
  const showLaser = sceneEffects.includes('laser');
  const showHeat = sceneEffects.includes('heat');
  const forceWireframe = crossSection || cameraMode === 'sectionView';
  const forceXRay = xRay || cameraMode === 'xRayView';
  const derivedExploded = exploded || cameraMode === 'explodedView';
  const shouldRotate = cameraMode !== 'freeCamera' && !animationPausedByProfile(performanceProfile);

  return (
    <Canvas shadows camera={{ position: cameraPosition, fov: 45 }}>
      <CameraStateReporter onCameraStateChange={onCameraStateChange} />
      <fog attach="fog" args={['#020617', sceneLighting.fogNear, sceneLighting.fogFar]} />
      <ambientLight intensity={sceneLighting.ambient} />
      <directionalLight position={[5, 8, 5]} intensity={sceneLighting.directional} castShadow />
      <pointLight position={[-4, 2, -4]} intensity={sceneLighting.point} />
      <Environment preset="city" />
      <group>
        {viewObjects.map((object, index) => {
          const position = derivedExploded ? [object.position[0], object.position[1] + (index % 2 === 0 ? 0.6 : -0.4), object.position[2]] : object.position;
          const isSelected = selectedPart === object.label;
          const emissiveIntensity = isSelected ? highlightPreset.emissiveIntensity : hovered === object.label ? 0.2 : 0;
          const baseOpacity = forceXRay ? 0.35 : highlightPreset.opacity;
          const dynamicPulse = activeTimelineStep?.target === object.label && showParticles ? 1 + Math.sin(index + Date.now() / 250) * 0.03 : 1;
          return (
            <mesh
              key={`${object.label}-${index}`}
              position={position}
              onClick={() => {
                onSelectPart?.(object.label);
                onHotspot?.(object);
              }}
              onPointerOver={() => setHovered(object.label)}
              onPointerOut={() => setHovered(null)}
              castShadow
              receiveShadow
              scale={isSelected ? highlightPreset.scale * dynamicPulse : 1}
            >
              <boxGeometry args={object.size} />
              <meshStandardMaterial
                color={isSelected ? '#22d3ee' : hovered === object.label ? '#f59e0b' : object.color}
                emissive={new THREE.Color(isSelected ? '#22d3ee' : '#000000')}
                emissiveIntensity={emissiveIntensity}
                transparent={forceXRay || highlightPreset.opacity < 1}
                opacity={baseOpacity}
                wireframe={forceWireframe}
              />
              {showLabels && showDynamicLabels ? <Html position={[0, 1.2, 0]} center>{object.label}</Html> : null}
            </mesh>
          );
        })}
        {viewObjects.length === 0 ? <PrimitiveShape label="Concept" color="#34d399" position={[0, 0, 0]} /> : null}
      </group>
      {showParticles ? (
        <group>
          {[0, 1, 2, 3, 4, 5].map((item) => (
            <mesh key={`particle-${item}`} position={[item * 0.45 - 1.3, 1.6 + Math.sin(item), -1.5]}>
              <sphereGeometry args={[0.05, 8, 8]} />
              <meshStandardMaterial color={sceneEffects.includes('bloodFlow') ? '#ef4444' : sceneEffects.includes('waterFlow') ? '#38bdf8' : '#f8fafc'} emissive={new THREE.Color('#0ea5e9')} emissiveIntensity={0.3} />
            </mesh>
          ))}
        </group>
      ) : null}
      {showLaser ? (
        <mesh position={[0, 1.2, -1]}>
          <cylinderGeometry args={[0.02, 0.02, 5, 12]} />
          <meshStandardMaterial color="#f43f5e" emissive={new THREE.Color('#f43f5e')} emissiveIntensity={0.8} />
        </mesh>
      ) : null}
      {showHeat ? (
        <Html center position={[0, 2.1, 0]}>
          <div className="rounded-full border border-amber-500/40 bg-amber-500/15 px-3 py-1 text-[11px] text-amber-100">Heat zone active</div>
        </Html>
      ) : null}
      <OrbitControls enablePan enableZoom enableRotate autoRotate={autoRotate && shouldRotate} autoRotateSpeed={motionSpeed} target={focusState.lookAt || activeObject?.position || [0, 0, 0]} />
      <Html center position={[0, -2.6, 0]}>
        <div className="rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1 text-xs text-slate-300">{scene?.title || 'Interactive learning scene'}</div>
      </Html>
      {measurementMode ? (
        <Html center position={[0, -3.2, 0]}>
          <div className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-[11px] text-cyan-100">Measurement: distance from origin {distance} units</div>
        </Html>
      ) : null}
      <Html center position={[0, -3.8, 0]}>
        <div className="rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1 text-[11px] text-slate-300">Mode: {cameraMode} • Environment: {environmentPreset} • LOD: {lodLevel}</div>
      </Html>
    </Canvas>
  );
}

function CameraStateReporter({ onCameraStateChange }) {
  const lastStateRef = useRef('');
  const lastEmitRef = useRef(0);

  useFrame((state) => {
    if (!onCameraStateChange) return;
    const position = state.camera?.position;
    if (!position) return;

    const now = Date.now();
    if (now - lastEmitRef.current < 450) return;

    const snapshot = [
      Number(position.x.toFixed(2)),
      Number(position.y.toFixed(2)),
      Number(position.z.toFixed(2))
    ];
    const key = snapshot.join('|');
    if (key === lastStateRef.current) return;

    lastStateRef.current = key;
    lastEmitRef.current = now;
    onCameraStateChange(snapshot);
  });
  return null;
}

function animationPausedByProfile(profile = 'balanced') {
  return profile === 'battery-saver';
}
