export class SceneNode {
  constructor({
    id,
    kind,
    metadata = {},
    parent = null,
    children = [],
    state = 'Created',
    properties = {},
    runtimeData = {}
  } = {}) {
    this.id = String(id || '').trim();
    this.kind = String(kind || 'Generic').trim();
    this.metadata = metadata && typeof metadata === 'object' ? { ...metadata } : {};
    this.parent = parent || null;
    this.children = Array.isArray(children) ? [...children] : [];
    this.state = state || 'Created';
    this.properties = properties && typeof properties === 'object' ? { ...properties } : {};
    this.runtimeData = runtimeData && typeof runtimeData === 'object' ? { ...runtimeData } : {};
  }
}

export class GenericSceneNode extends SceneNode {
  constructor(payload = {}) {
    super({ ...payload, kind: payload.kind || 'Generic' });
    this.runtimeData = {
      ...this.runtimeData,
      generic: true
    };
  }
}
