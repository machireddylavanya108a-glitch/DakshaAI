import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'

function FloatingShape({ type, color, position, scale, speed }) {
  const ref = useRef()

  useFrame((state, delta) => {
    if (!ref.current) return
    ref.current.rotation.x += delta * 0.22
    ref.current.rotation.y += delta * 0.18
    ref.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * speed) * 0.22
    ref.current.position.x = position[0] + Math.cos(state.clock.elapsedTime * speed * 0.8) * 0.18
  })

  return (
    <mesh ref={ref} position={position} scale={scale}>
      {type === 'box' && <boxGeometry args={[1, 1, 1, 24, 24, 24]} />}
      {type === 'sphere' && <sphereGeometry args={[0.85, 32, 32]} />}
      {type === 'torus' && <torusGeometry args={[0.65, 0.2, 30, 100]} />}
      {type === 'cylinder' && <cylinderGeometry args={[0.35, 0.35, 1.6, 32]} />}
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.45}
        metalness={0.75}
        roughness={0.18}
        transparent
        opacity={0.92}
      />
    </mesh>
  )
}

export default function AnimatedHeroScene() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 hidden lg:block">
      <Canvas camera={{ position: [0, 1.5, 10], fov: 35 }}>
        <ambientLight intensity={0.45} />
        <directionalLight intensity={1.5} position={[5, 5, 5]} color="#7c3aed" />
        <pointLight intensity={0.8} position={[-4, -2, 5]} color="#38bdf8" />
        <FloatingShape type="torus" color="#8b5cf6" position={[-3, 0.25, -1]} scale={[1.2, 1.2, 1.2]} speed={0.9} />
        <FloatingShape type="sphere" color="#22d3ee" position={[2.5, 0.5, -0.8]} scale={[1.05, 1.05, 1.05]} speed={0.8} />
        <FloatingShape type="box" color="#a855f7" position={[0.8, -0.2, 1.2]} scale={[0.95, 0.95, 0.95]} speed={1.1} />
        <FloatingShape type="cylinder" color="#38bdf8" position={[-1.5, -0.5, 2.1]} scale={[0.9, 0.9, 0.9]} speed={1.3} />
      </Canvas>
    </div>
  )
}
