import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';

const incidentLog = new Set();

function warnIncidentOnce(key, message) {
  if (incidentLog.has(key)) return;
  incidentLog.add(key);
  console.warn(message);
}

export default function WebGLContextManager({ onContextLost, onContextRestored, pauseForVisibility, resumeForVisibility }) {
  const { gl, invalidate } = useThree();
  const incidentIdRef = useRef(0);

  useEffect(() => {
    const canvas = gl?.domElement;
    if (!canvas) return undefined;

    const handleLost = (event) => {
      event.preventDefault();
      incidentIdRef.current += 1;
      const incidentKey = `context-lost-${incidentIdRef.current}`;
      warnIncidentOnce(incidentKey, '[3D] WebGL context lost. Pausing visualization and waiting for restore.');
      onContextLost?.();
    };

    const handleRestored = () => {
      onContextRestored?.();
      invalidate();
    };

    canvas.addEventListener('webglcontextlost', handleLost, false);
    canvas.addEventListener('webglcontextrestored', handleRestored, false);

    return () => {
      canvas.removeEventListener('webglcontextlost', handleLost, false);
      canvas.removeEventListener('webglcontextrestored', handleRestored, false);
    };
  }, [gl, invalidate, onContextLost, onContextRestored]);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;

    const handleVisibility = () => {
      if (document.hidden) {
        pauseForVisibility?.();
      } else {
        resumeForVisibility?.();
        invalidate();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility, false);
    return () => document.removeEventListener('visibilitychange', handleVisibility, false);
  }, [invalidate, pauseForVisibility, resumeForVisibility]);

  return null;
}
