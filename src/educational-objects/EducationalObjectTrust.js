function toObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function toLevelRank(level = 'untrusted') {
  const normalized = String(level || 'untrusted').toLowerCase().trim();
  if (normalized === 'system') return 5;
  if (normalized === 'trusted') return 4;
  if (normalized === 'standard') return 3;
  if (normalized === 'low') return 2;
  return 1;
}

export function createEducationalObjectTrust(input = {}, options = {}) {
  const source = toObject(input);
  const metadata = toObject(source.metadata);

  const providedLevel = String(source.level || '').toLowerCase().trim();
  const generated = source.generated === true;
  const imported = source.imported === true;
  const runtimeProvided = source.runtimeProvided === true;
  const userProvided = source.userProvided === true;
  const signed = source.signed === true;
  const validated = source.validated === true;

  let level = providedLevel || 'untrusted';
  if (!providedLevel) {
    if (signed && validated) level = 'trusted';
    else if (runtimeProvided && validated) level = 'standard';
    else if (generated || imported || userProvided) level = 'low';
    else level = 'untrusted';
  }

  if (generated || imported) {
    if (toLevelRank(level) > toLevelRank('standard')) level = 'standard';
  }

  return {
    level,
    source: String(source.source || options.source || 'unknown'),
    validated,
    signed,
    generated,
    userProvided,
    runtimeProvided,
    imported,
    lastVerifiedAt: source.lastVerifiedAt || null,
    metadata
  };
}

export function canTrustAllowSharedReuse(trust = {}, threshold = 'trusted') {
  return toLevelRank(trust?.level) >= toLevelRank(threshold);
}

export function summarizeTrustDistribution(entries = []) {
  const distribution = Object.create(null);
  (Array.isArray(entries) ? entries : []).forEach((entry) => {
    const level = String(entry?.trustLevel || entry?.trust?.level || 'untrusted');
    distribution[level] = Number(distribution[level] || 0) + 1;
  });
  return distribution;
}
