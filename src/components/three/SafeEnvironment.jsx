import { useEffect } from 'react';
import { isTrustedAssetUrl } from '../../config/threeAssets.js';

const warned = new Set();

function warnOnce(key, message) {
  if (warned.has(key)) return;
  warned.add(key);
  console.warn(message);
}

function ProceduralLights() {
  return (
    <>
      <ambientLight intensity={0.7} />
      <hemisphereLight intensity={0.8} groundColor="#1e293b" />
      <directionalLight position={[5, 8, 5]} intensity={1.2} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
      <directionalLight position={[-4, 3, -4]} intensity={0.35} />
    </>
  );
}

export default function SafeEnvironment({ localHdr = '', enabled = true }) {
  useEffect(() => {
    if (!enabled) return;

    const hdr = String(localHdr || '').trim();
    if (!hdr) return;

    if (!isTrustedAssetUrl(hdr)) {
      warnOnce(`hdr-untrusted:${hdr}`, `[3D] Blocked untrusted HDR asset URL: ${hdr}`);
      return;
    }

    const lowered = hdr.toLowerCase();
    const blockedExternalHost = lowered.includes('githack') || (lowered.includes('drei') && lowered.includes('asset'));
    if (blockedExternalHost) {
      warnOnce(`hdr-blocked:${hdr}`, `[3D] Blocked unsupported external HDR source: ${hdr}`);
      return;
    }

    warnOnce(`hdr-safe-mode:${hdr}`, `[3D] Local HDR is configured (${hdr}) but safe runtime is using procedural environment lighting.`);
  }, [enabled, localHdr]);

  return <ProceduralLights />;
}
