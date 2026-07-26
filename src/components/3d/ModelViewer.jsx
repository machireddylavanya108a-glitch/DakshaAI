import { useMemo } from 'react';
import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export default function ModelViewer({ model, selectedPart, onSelectPart }) {
  const parts = useMemo(() => {
    switch (model?.id) {
      case 'heart':
        return [
          { name: 'Atria', color: '#ff6b6b', position: [0, 0.7, 0] },
          { name: 'Ventricles', color: '#4ecdc4', position: [0, -0.2, 0] },
          { name: 'Valves', color: '#ffe66d', position: [0.6, 0.25, 0.2] },
        ];
      case 'brain':
        return [
          { name: 'Cerebrum', color: '#7c3aed', position: [0, 0.6, 0] },
          { name: 'Cerebellum', color: '#38bdf8', position: [0.2, -0.3, 0] },
          { name: 'Brainstem', color: '#f59e0b', position: [0, -0.8, 0] },
        ];
      case 'solar-system':
        return [
          { name: 'Sun', color: '#fbbf24', position: [0, 0, 0] },
          { name: 'Earth', color: '#60a5fa', position: [2.4, 0, 0] },
          { name: 'Mars', color: '#fb923c', position: [3.8, 0, 0] },
        ];
      case 'electric-motor':
        return [
          { name: 'Rotor', color: '#14b8a6', position: [0, 0, 0] },
          { name: 'Stator', color: '#6366f1', position: [0, 0, 1.2] },
          { name: 'Coils', color: '#f472b6', position: [0, 0.8, 0] },
        ];
      case 'dna':
        return [
          { name: 'Base Pairs', color: '#22c55e', position: [0, 0.8, 0] },
          { name: 'Sugar Backbone', color: '#8b5cf6', position: [0, 0, 0] },
          { name: 'Helix Twist', color: '#fb7185', position: [0, -0.8, 0] },
        ];
      case 'atom':
        return [
          { name: 'Nucleus', color: '#fb923c', position: [0, 0, 0] },
          { name: 'Electrons', color: '#38bdf8', position: [1.2, 0, 0] },
          { name: 'Orbitals', color: '#a78bfa', position: [0, 1.2, 0] },
        ];
      case 'earth-layers':
        return [
          { name: 'Crust', color: '#86efac', position: [0, 0, 0] },
          { name: 'Mantle', color: '#f59e0b', position: [0, -0.3, 0] },
          { name: 'Core', color: '#38bdf8', position: [0, -0.8, 0] },
        ];
      case 'cell':
        return [
          { name: 'Membrane', color: '#f472b6', position: [0, 0, 0] },
          { name: 'Nucleus', color: '#60a5fa', position: [0.4, 0.4, 0] },
          { name: 'Organelles', color: '#34d399', position: [-0.5, -0.3, 0] },
        ];
      case 'cpu':
        return [
          { name: 'Core', color: '#22d3ee', position: [0, 0, 0] },
          { name: 'Cache', color: '#818cf8', position: [0.6, 0.4, 0] },
          { name: 'Registers', color: '#f59e0b', position: [-0.6, -0.4, 0] },
        ];
      case 'bridge':
        return [
          { name: 'Deck', color: '#f472b6', position: [0, 0.3, 0] },
          { name: 'Supports', color: '#38bdf8', position: [0, -0.4, 0] },
          { name: 'Tension Members', color: '#fbbf24', position: [0.7, 0.1, 0] },
        ];
      default:
        return [
          { name: 'Core', color: '#4f46e5', position: [0, 0, 0] },
          { name: 'Structure', color: '#34d399', position: [0.4, 0.2, 0] },
        ];
    }
  }, [model]);

  const groupRef = useMemo(() => new THREE.Group(), []);

  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.15;
    }
  });

  return (
    <group ref={groupRef}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[2.2, 2.2, 2.2]} />
        <meshStandardMaterial color="#0f172a" emissive="#111827" emissiveIntensity={0.25} />
      </mesh>

      {parts.map((part) => {
        const isSelected = selectedPart === part.name;
        return (
          <group key={part.name}>
            <mesh position={part.position} onClick={() => onSelectPart(part.name)}>
              <sphereGeometry args={[0.35, 24, 24]} />
              <meshStandardMaterial color={part.color} emissive={isSelected ? '#ffffff' : '#000000'} emissiveIntensity={isSelected ? 0.5 : 0.1} />
            </mesh>
            <Html position={[part.position[0], part.position[1] + 0.55, part.position[2]]} center>
              <div className="rounded-full border border-white/20 bg-slate-950/80 px-2 py-1 text-[10px] text-slate-100">{part.name}</div>
            </Html>
          </group>
        );
      })}
    </group>
  );
}
