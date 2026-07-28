function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function toArray(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null) return [];
  return [value];
}

function normalizeToken(value = '') {
  return String(value || '').trim().toLowerCase();
}

function normalizeArray(values = []) {
  return [...new Set(toArray(values).map(normalizeToken).filter(Boolean))];
}

export function normalizeTemplateQuery(query = {}) {
  const source = isObject(query) ? query : {};
  return {
    semanticPurposes: normalizeArray(source.semanticPurposes),
    capabilityIds: normalizeArray(source.capabilityIds),
    capabilityRoles: normalizeArray(source.capabilityRoles),
    learningActions: normalizeArray(source.learningActions),
    spatialNeeds: normalizeArray(source.spatialNeeds),
    temporalNeeds: normalizeArray(source.temporalNeeds),
    interactionNeeds: normalizeArray(source.interactionNeeds),
    accessibilityNeeds: normalizeArray(source.accessibilityNeeds),
    performanceProfile: normalizeToken(source.performanceProfile || ''),
    requiredFeatures: normalizeArray(source.requiredFeatures),
    excludedFeatures: normalizeArray(source.excludedFeatures),
    sourcePreferences: normalizeArray(source.sourcePreferences),
    versionConstraints: isObject(source.versionConstraints) ? source.versionConstraints : {},
    trustRequirements: isObject(source.trustRequirements) ? source.trustRequirements : {},
    complexityBudget: isObject(source.complexityBudget) ? source.complexityBudget : {},
    metadata: isObject(source.metadata) ? source.metadata : {}
  };
}

function featureSetFromTemplate(template = {}) {
  const features = new Set();
  const add = (value) => {
    const token = normalizeToken(value);
    if (token) features.add(token);
  };

  add(template.semanticPurpose);
  add(template.layout?.strategy);
  add(template.performance?.minimumProfile);
  add(template.performance?.maximumProfile);

  (Array.isArray(template.requiredCapabilities) ? template.requiredCapabilities : []).forEach((item) => {
    add(item?.capabilityId);
    add(item?.role);
  });
  (Array.isArray(template.optionalCapabilities) ? template.optionalCapabilities : []).forEach((item) => {
    add(item?.capabilityId);
    add(item?.role);
  });
  (Array.isArray(template.slots) ? template.slots : []).forEach((slot) => {
    add(slot?.purpose);
    (Array.isArray(slot?.accepts) ? slot.accepts : []).forEach(add);
  });

  const accessibility = template.accessibility || {};
  Object.entries(accessibility).forEach(([key, value]) => {
    if (value === true) add(key);
  });

  return features;
}

function matchesVersionConstraint(templateVersion = '', constraints = {}) {
  const value = String(templateVersion || '').trim();
  if (!value) return false;

  const min = String(constraints.min || '').trim();
  const max = String(constraints.max || '').trim();
  const exact = String(constraints.exact || '').trim();

  const toNumber = (version) => {
    const normalized = String(version || '').replace(/^v/i, '');
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  };

  if (exact && value !== exact) return false;

  const valueNumber = toNumber(value);
  const minNumber = toNumber(min);
  const maxNumber = toNumber(max);

  if (min && valueNumber !== null && minNumber !== null && valueNumber < minNumber) return false;
  if (max && valueNumber !== null && maxNumber !== null && valueNumber > maxNumber) return false;

  return true;
}

export function matchesTemplateQuery(entry, query = {}) {
  const normalized = normalizeTemplateQuery(query);
  const template = entry?.template || {};
  const features = featureSetFromTemplate(template);

  if (normalized.semanticPurposes.length && !normalized.semanticPurposes.includes(normalizeToken(template.semanticPurpose))) {
    return false;
  }

  if (!matchesVersionConstraint(template.version, normalized.versionConstraints)) return false;

  const capabilityIds = new Set([
    ...(Array.isArray(template.requiredCapabilities) ? template.requiredCapabilities : []).map((item) => normalizeToken(item?.capabilityId)),
    ...(Array.isArray(template.optionalCapabilities) ? template.optionalCapabilities : []).map((item) => normalizeToken(item?.capabilityId))
  ].filter(Boolean));

  if (normalized.capabilityIds.length && !normalized.capabilityIds.every((token) => capabilityIds.has(token))) {
    return false;
  }

  const capabilityRoles = new Set([
    ...(Array.isArray(template.requiredCapabilities) ? template.requiredCapabilities : []).map((item) => normalizeToken(item?.role)),
    ...(Array.isArray(template.optionalCapabilities) ? template.optionalCapabilities : []).map((item) => normalizeToken(item?.role))
  ].filter(Boolean));

  if (normalized.capabilityRoles.length && !normalized.capabilityRoles.some((token) => capabilityRoles.has(token))) {
    return false;
  }

  if (normalized.performanceProfile) {
    const minimum = normalizeToken(template.performance?.minimumProfile || 'low');
    const maximum = normalizeToken(template.performance?.maximumProfile || 'high');
    const rank = { low: 1, balanced: 2, high: 3, auto: 2 };
    const requested = rank[normalized.performanceProfile] || 2;
    if (requested < (rank[minimum] || 1) || requested > (rank[maximum] || 3)) {
      return false;
    }
  }

  if (normalized.requiredFeatures.length && !normalized.requiredFeatures.every((token) => features.has(token))) {
    return false;
  }

  if (normalized.excludedFeatures.length && normalized.excludedFeatures.some((token) => features.has(token))) {
    return false;
  }

  if (normalized.sourcePreferences.length) {
    const source = normalizeToken(entry?.source || template.source);
    if (source && !normalized.sourcePreferences.includes(source)) return false;
  }

  if (normalized.trustRequirements.minimumLevel !== undefined) {
    const minTrust = Number(normalized.trustRequirements.minimumLevel);
    const trust = Number(entry?.trustLevel || 0.5);
    if (Number.isFinite(minTrust) && trust < minTrust) return false;
  }

  return true;
}
