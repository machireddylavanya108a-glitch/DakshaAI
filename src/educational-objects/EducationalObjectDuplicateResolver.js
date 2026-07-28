import { createEducationalObjectFingerprint } from './EducationalObjectFingerprint.js';

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function chooseCanonical(a, b, strategy = 'keep-existing') {
  if (!a) return b;
  if (!b) return a;

  if (strategy === 'replace') return b;
  if (strategy === 'prefer-higher-quality') {
    return Number(b?.quality?.score || 0) > Number(a?.quality?.score || 0) ? b : a;
  }
  if (strategy === 'prefer-trusted') {
    const rank = { untrusted: 1, low: 2, standard: 3, trusted: 4, system: 5 };
    return (rank[String(b?.trustLevel || 'untrusted')] || 1) > (rank[String(a?.trustLevel || 'untrusted')] || 1) ? b : a;
  }

  return a;
}

export function detectEducationalObjectDuplicates(objects = [], options = {}) {
  const strategy = String(options.strategy || 'keep-existing');
  const source = toArray(objects).filter((item) => item && typeof item === 'object');

  const byIdVersion = new Map();
  const byFingerprint = new Map();
  const duplicates = [];
  const conflicts = [];

  source.forEach((item, index) => {
    const objectId = String(item.objectId || item.id || '').trim() || `object-${index + 1}`;
    const version = String(item.version || 'v1').trim();
    const key = `${objectId}::${version}`;
    const fingerprint = String(item.fingerprint || createEducationalObjectFingerprint(item));

    if (byIdVersion.has(key)) {
      duplicates.push({ type: 'id-version', key, existing: byIdVersion.get(key), duplicate: item });
    } else {
      byIdVersion.set(key, item);
    }

    if (byFingerprint.has(fingerprint)) {
      duplicates.push({ type: 'fingerprint', key: fingerprint, existing: byFingerprint.get(fingerprint), duplicate: item });
    } else {
      byFingerprint.set(fingerprint, item);
    }

    const labelTexts = new Set(toArray(item.labels).map((label) => String(label?.text || '').trim().toLowerCase()).filter(Boolean));
    if (labelTexts.size && labelTexts.size !== toArray(item.labels).length) {
      duplicates.push({ type: 'label', key: objectId, duplicate: item });
    }

    const relationKeys = new Set(toArray(item.relationshipReferences).map((relation) => `${relation?.sourceObjectId || ''}::${relation?.relation || ''}::${relation?.targetObjectId || ''}`));
    if (relationKeys.size && relationKeys.size !== toArray(item.relationshipReferences).length) {
      duplicates.push({ type: 'relationship', key: objectId, duplicate: item });
    }

    const bindingKeys = new Set(toArray(item.templateBindings).map((binding) => `${binding?.templateId || ''}::${binding?.slotId || ''}::${binding?.regionId || ''}`));
    if (bindingKeys.size && bindingKeys.size !== toArray(item.templateBindings).length) {
      duplicates.push({ type: 'template-binding', key: objectId, duplicate: item });
    }
  });

  const canonicalByKey = new Map();
  source.forEach((item, index) => {
    const objectId = String(item.objectId || item.id || '').trim() || `object-${index + 1}`;
    const version = String(item.version || 'v1').trim();
    const key = `${objectId}::${version}`;
    const current = canonicalByKey.get(key);

    if (!current) {
      canonicalByKey.set(key, item);
      return;
    }

    const conflict = {
      key,
      requiredConflict: Boolean(
        toArray(current.relationshipReferences).some((relation) => relation?.required === true)
        && toArray(item.relationshipReferences).some((relation) => relation?.required === true)
      )
    };

    if (conflict.requiredConflict && strategy === 'merge-safe') {
      conflicts.push({ ...conflict, reason: 'required-relationship-conflict-not-merged' });
      canonicalByKey.set(key, current);
      return;
    }

    if (strategy === 'merge-safe') {
      const merged = {
        ...current,
        ...item,
        labels: [...toArray(current.labels), ...toArray(item.labels)]
          .filter((label, idx, list) => list.findIndex((entry) => String(entry?.id || entry?.text || idx) === String(label?.id || label?.text || idx)) === idx),
        relationshipReferences: [...toArray(current.relationshipReferences), ...toArray(item.relationshipReferences)]
          .filter((relation, idx, list) => list.findIndex((entry) => String(entry?.relationId || idx) === String(relation?.relationId || idx)) === idx),
        templateBindings: [...toArray(current.templateBindings), ...toArray(item.templateBindings)]
          .filter((binding, idx, list) => list.findIndex((entry) => `${entry?.templateId || ''}::${entry?.slotId || ''}::${entry?.regionId || ''}` === `${binding?.templateId || ''}::${binding?.slotId || ''}::${binding?.regionId || ''}`) === idx)
      };
      canonicalByKey.set(key, merged);
      return;
    }

    canonicalByKey.set(key, chooseCanonical(current, item, strategy));
  });

  const canonicalObjects = [...canonicalByKey.values()];

  return {
    duplicates,
    canonicalObjects,
    mergedObjects: strategy === 'merge-safe' ? canonicalObjects : [],
    conflicts,
    diagnostics: {
      inputCount: source.length,
      duplicateCount: duplicates.length,
      conflictCount: conflicts.length,
      strategy
    }
  };
}
