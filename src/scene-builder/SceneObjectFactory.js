function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function singularize(key = '') {
  const normalized = String(key || '').trim();
  if (!normalized) return 'node';
  if (normalized.endsWith('ies')) return `${normalized.slice(0, -3)}y`;
  if (normalized.endsWith('s')) return normalized.slice(0, -1);
  return normalized;
}

function createNodeSpec({ id, kind, metadata = {}, properties = {}, runtimeData = {}, parent = null }) {
  return {
    id,
    kind,
    metadata,
    properties,
    runtimeData,
    parent
  };
}

export function deriveKnownKinds(sceneJson = {}) {
  const kinds = new Set(['scene']);
  Object.entries(sceneJson || {}).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      kinds.add(singularize(key));
    } else if (isObject(value)) {
      kinds.add(key);
    }
  });
  return [...kinds];
}

export function createNodeSpecsFromScene(sceneJson = {}) {
  const sceneId = String(sceneJson.sceneId || 'scene-root');
  const specs = [
    createNodeSpec({
      id: sceneId,
      kind: 'scene',
      metadata: {
        title: sceneJson.title,
        subject: sceneJson.subject,
        version: sceneJson.version
      },
      properties: {
        classification: sceneJson.classification || {},
        settings: sceneJson.settings || {}
      }
    })
  ];

  Object.entries(sceneJson || {}).forEach(([key, value]) => {
    if (['sceneId', 'title', 'subject', 'version'].includes(key)) return;

    if (Array.isArray(value)) {
      const kind = singularize(key);
      value.forEach((item, index) => {
        const data = isObject(item) ? item : { value: item };
        const id = String(data.id || `${kind}-${index + 1}`);
        specs.push(createNodeSpec({
          id,
          kind,
          parent: sceneId,
          metadata: {
            sourceKey: key,
            index
          },
          properties: { ...data },
          runtimeData: {
            raw: data
          }
        }));
      });
      return;
    }

    if (isObject(value)) {
      specs.push(createNodeSpec({
        id: String(value.id || key),
        kind: key,
        parent: sceneId,
        metadata: {
          sourceKey: key
        },
        properties: { ...value },
        runtimeData: {
          raw: value
        }
      }));
    }
  });

  return specs;
}
