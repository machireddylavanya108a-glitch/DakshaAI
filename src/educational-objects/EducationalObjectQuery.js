function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function toSet(values = []) {
  return new Set(toArray(values).map((value) => String(value || '').trim()).filter(Boolean));
}

function intersects(values, targets) {
  if (!targets.size) return true;
  const list = toArray(values).map((value) => String(value || '').trim());
  return list.some((value) => targets.has(value));
}

function includesValue(value, targets) {
  if (!targets.size) return true;
  return targets.has(String(value || '').trim());
}

function hasAllFeatures(candidate, required = []) {
  const requiredSet = new Set(toArray(required).map((item) => String(item || '').trim()).filter(Boolean));
  if (!requiredSet.size) return true;

  const raw = JSON.stringify(candidate || {}).toLowerCase();
  for (const feature of requiredSet) {
    if (!raw.includes(String(feature).toLowerCase())) return false;
  }
  return true;
}

function hasExcludedFeatures(candidate, excluded = []) {
  const excludedSet = new Set(toArray(excluded).map((item) => String(item || '').trim()).filter(Boolean));
  if (!excludedSet.size) return false;
  const raw = JSON.stringify(candidate || {}).toLowerCase();
  for (const feature of excludedSet) {
    if (raw.includes(String(feature).toLowerCase())) return true;
  }
  return false;
}

export function matchesEducationalObjectQuery(entry = {}, query = {}) {
  const object = entry?.object || {};
  const objectIds = toSet(query.objectIds);
  const versions = toSet(query.versions);
  const kinds = toSet(query.kinds);
  const semanticRoles = toSet(query.semanticRoles);
  const learningPurposes = toSet(query.learningPurposes);
  const capabilityIds = toSet(query.capabilityIds);
  const representationModes = toSet(query.representationModes);
  const templateIds = toSet(query.templateIds);
  const slotIds = toSet(query.slotIds);
  const regionIds = toSet(query.regionIds);
  const sourcePreferences = toSet(query.sourcePreferences);

  if (!includesValue(entry.objectId, objectIds)) return false;
  if (!includesValue(entry.version, versions)) return false;
  if (!includesValue(object.kind, kinds)) return false;
  if (!includesValue(object.semanticRole, semanticRoles)) return false;
  if (!includesValue(object.learningPurpose, learningPurposes)) return false;
  if (sourcePreferences.size && !sourcePreferences.has(String(entry.source || '').trim())) return false;

  const objectCapabilityIds = toArray(object.capabilityReferences).map((item) => item?.capabilityId);
  if (!intersects(objectCapabilityIds, capabilityIds)) return false;

  const representationMode = object?.representation?.mode || object?.runtimeMetadata?.representation?.mode;
  if (!includesValue(representationMode, representationModes)) return false;

  const bindingTemplateIds = toArray(object.templateBindings).map((item) => item?.templateId);
  const bindingSlotIds = toArray(object.templateBindings).map((item) => item?.slotId);
  const bindingRegionIds = toArray(object.templateBindings).map((item) => item?.regionId);

  if (!intersects(bindingTemplateIds, templateIds)) return false;
  if (!intersects(bindingSlotIds, slotIds)) return false;
  if (!intersects(bindingRegionIds, regionIds)) return false;

  if (Number.isFinite(Number(query.qualityThreshold))) {
    if (Number(entry?.quality?.score || 0) < Number(query.qualityThreshold)) return false;
  }

  const trustRequirements = query.trustRequirements || {};
  if (trustRequirements.minimumLevel) {
    const levels = ['untrusted', 'low', 'standard', 'trusted', 'system'];
    const currentIndex = levels.indexOf(String(entry.trustLevel || '').toLowerCase());
    const minimumIndex = levels.indexOf(String(trustRequirements.minimumLevel || '').toLowerCase());
    if (minimumIndex >= 0 && currentIndex >= 0 && currentIndex < minimumIndex) return false;
  }

  if (!hasAllFeatures(object, query.requiredFeatures)) return false;
  if (hasExcludedFeatures(object, query.excludedFeatures)) return false;

  if (query.ownership && typeof query.ownership === 'object') {
    const requiredOwnershipMode = String(query.ownership.mode || '').trim();
    if (requiredOwnershipMode && String(entry?.ownership?.mode || object?.ownership?.mode || '').trim() !== requiredOwnershipMode) return false;
  }

  return true;
}

export function queryEducationalObjectEntries(entries = [], query = {}) {
  const list = Array.isArray(entries) ? entries : [];
  return list.filter((entry) => matchesEducationalObjectQuery(entry, query));
}
