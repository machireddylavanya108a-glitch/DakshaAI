import { useEffect, useState } from 'react';

export default function AnimationController({ autoRotate, onToggle }) {
  const [running, setRunning] = useState(autoRotate);

  useEffect(() => {
    setRunning(autoRotate);
  }, [autoRotate]);

  return (
    <button onClick={() => {
      const next = !running;
      setRunning(next);
      onToggle?.(next);
    }} className="rounded-full border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-200">
      {running ? 'Pause Animation' : 'Resume Animation'}
    </button>
  );
}
