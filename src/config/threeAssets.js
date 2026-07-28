const runtimeEnv = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : {};

function normalize(value) {
  return String(value || '').trim();
}

export const TRUSTED_ASSET_ORIGINS = new Set([
  typeof window !== 'undefined' && window.location?.origin ? window.location.origin : '',
  'http://localhost:14173'
].filter(Boolean));

export const THREE_ASSETS = {
  environments: {
    studio: normalize(runtimeEnv.VITE_THREE_HDR_STUDIO)
  },
  models: {
    heart: '/assets/models/heart.glb',
    cell: '/assets/models/cell.glb'
  }
};

export function isSameOriginPath(url = '') {
  const value = normalize(url);
  return value.startsWith('/');
}

export function isTrustedAssetUrl(url = '', allowlist = TRUSTED_ASSET_ORIGINS) {
  const value = normalize(url);
  if (!value) return false;
  if (isSameOriginPath(value)) return true;

  try {
    const parsed = new URL(value);
    return allowlist.has(parsed.origin);
  } catch {
    return false;
  }
}

export function resolveEnvironmentAsset(key = 'studio') {
  const candidate = THREE_ASSETS.environments[key] || '';
  if (!candidate) return '';
  return isTrustedAssetUrl(candidate) ? candidate : '';
}

export function resolveModelAsset(key = '') {
  const candidate = THREE_ASSETS.models[key] || '';
  if (!candidate) return '';
  return isTrustedAssetUrl(candidate) ? candidate : '';
}
