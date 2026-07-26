export default function Lighting() {
  return (
    <>
      <directionalLight position={[5, 5, 5]} intensity={1.2} color="#f8fafc" />
      <directionalLight position={[-5, -3, -5]} intensity={0.8} color="#38bdf8" />
      <pointLight position={[0, 0, 4]} intensity={1.4} color="#60a5fa" />
    </>
  );
}
