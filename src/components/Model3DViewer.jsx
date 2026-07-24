import { Canvas } from '@react-three/fiber';
import { OrbitControls, Sphere, MeshDistortMaterial } from '@react-three/drei';

export default function Model3DViewer() {
  return (
    <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
      <ambientLight intensity={0.5} />
      <directionalLight position={[2, 2, 2]} intensity={2} color="#6366f1" />
      <directionalLight position={[-2, -2, -2]} intensity={1.5} color="#a855f7" />
      
      {/* Glowing AI Core Sphere */}
      <Sphere visible args={[1, 100, 200]} scale={1.5}>
        <MeshDistortMaterial color="#4f46e5" attach="material" distort={0.4} speed={2} roughness={0.2} metalness={0.8} />
      </Sphere>

      <OrbitControls enableZoom={true} autoRotate={true} autoRotateSpeed={1.5} />
    </Canvas>
  );
}
