import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, Html } from '@react-three/drei';
import { useMemo, useState } from 'react';
import * as THREE from 'three';

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
  onHotspot
}) {
  const [hovered, setHovered] = useState(null);
  const objects = useMemo(() => scene?.objects || [], [scene]);
  const activeObject = objects.find((item) => item.label === selectedPart);

  const viewObjects = useMemo(() => {
    if (!hideInactive || !selectedPart) return objects;
    return objects.filter((item) => item.label === selectedPart);
  }, [objects, hideInactive, selectedPart]);

  const cameraPosition = activeObject?.position
    ? [activeObject.position[0] + 2.3, activeObject.position[1] + 1.4, activeObject.position[2] + 4.2]
    : [0, 2, 6];

  const distance = activeObject
    ? Math.sqrt((activeObject.position?.[0] || 0) ** 2 + (activeObject.position?.[1] || 0) ** 2 + (activeObject.position?.[2] || 0) ** 2).toFixed(2)
    : '0.00';

  return (
    <Canvas shadows camera={{ position: cameraPosition, fov: 45 }}>
      <fog attach="fog" args={['#020617', 6, 18]} />
      <ambientLight intensity={0.7} />
      <directionalLight position={[5, 8, 5]} intensity={1.2} castShadow />
      <pointLight position={[-4, 2, -4]} intensity={0.6} />
      <Environment preset="city" />
      <group>
        {viewObjects.map((object, index) => {
          const position = exploded ? [object.position[0], object.position[1] + (index % 2 === 0 ? 0.6 : -0.4), object.position[2]] : object.position;
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
              scale={selectedPart === object.label ? 1.08 : 1}
            >
              <boxGeometry args={object.size} />
              <meshStandardMaterial
                color={selectedPart === object.label ? '#22d3ee' : hovered === object.label ? '#f59e0b' : object.color}
                transparent={xRay}
                opacity={xRay ? 0.35 : 1}
                wireframe={crossSection}
              />
              {showLabels ? <Html position={[0, 1.2, 0]} center>{object.label}</Html> : null}
            </mesh>
          );
        })}
        {viewObjects.length === 0 ? <PrimitiveShape label="Concept" color="#34d399" position={[0, 0, 0]} /> : null}
      </group>
      <OrbitControls enablePan enableZoom enableRotate autoRotate={autoRotate} autoRotateSpeed={motionSpeed} target={activeObject?.position || [0, 0, 0]} />
      <Html center position={[0, -2.6, 0]}>
        <div className="rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1 text-xs text-slate-300">{scene?.title || 'Interactive learning scene'}</div>
      </Html>
      {measurementMode ? (
        <Html center position={[0, -3.2, 0]}>
          <div className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-[11px] text-cyan-100">Measurement: distance from origin {distance} units</div>
        </Html>
      ) : null}
    </Canvas>
  );
}
