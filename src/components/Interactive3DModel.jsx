import { Canvas } from '@react-three/fiber';
import { OrbitControls, Sphere } from '@react-three/drei';

function Planet({ position, color, scale, name, onClick, isSelected }) {
  return (
    <Sphere position={position} scale={scale} onClick={(e) => { e.stopPropagation(); onClick(name); }}>
      <meshStandardMaterial color={isSelected ? '#ffffff' : color} emissive={isSelected ? '#6366f1' : '#000000'} emissiveIntensity={isSelected ? 0.5 : 0} />
    </Sphere>
  );
}

export default function Interactive3DModel({ selectedPart, onSelectPart }) {
  return (
    <Canvas camera={{ position: [0, 5, 10], fov: 50 }}>
      <ambientLight intensity={0.3} />
      <pointLight position={[0, 0, 0]} intensity={2} distance={100} decay={0} />
      
      {/* Sun */}
      <Planet position={[0, 0, 0]} color="#ffdd00" scale={1.5} name="The Sun" onClick={onSelectPart} isSelected={selectedPart === 'The Sun'} />
      
      {/* Mercury */}
      <Planet position={[3, 0, 0]} color="#8c7853" scale={0.3} name="Mercury" onClick={onSelectPart} isSelected={selectedPart === 'Mercury'} />
      
      {/* Venus */}
      <Planet position={[4.5, 0, 0]} color="#e39e54" scale={0.5} name="Venus" onClick={onSelectPart} isSelected={selectedPart === 'Venus'} />
      
      {/* Earth */}
      <Planet position={[6, 0, 0]} color="#4f46e5" scale={0.6} name="Earth" onClick={onSelectPart} isSelected={selectedPart === 'Earth'} />
      
      {/* Mars */}
      <Planet position={[7.5, 0, 0]} color="#cc4444" scale={0.4} name="Mars" onClick={onSelectPart} isSelected={selectedPart === 'Mars'} />

      <OrbitControls enablePan={false} minDistance={5} maxDistance={20} />
    </Canvas>
  );
}
