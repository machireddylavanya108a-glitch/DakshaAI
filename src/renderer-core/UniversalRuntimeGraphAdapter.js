const SCHEMA_VERSION = 'v1';

function safeString(value) {
  return String(value || '').trim();
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function toFiniteNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function toKebab(value = '') {
  return safeString(value)
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function normalizeAdapterProfile(input = {}) {
  const source = isObject(input) ? input : {};
  return {
    schemaVersion: SCHEMA_VERSION,
    strictInputValidation: source.strictInputValidation === true,
    includeGenericUnknownNodes: source.includeGenericUnknownNodes !== false,
    diagnostics: {
      adaptations: Math.max(0, toFiniteNumber(source?.diagnostics?.adaptations, 0)),
      warnings: asArray(source?.diagnostics?.warnings),
      recoveries: Math.max(0, toFiniteNumber(source?.diagnostics?.recoveries, 0))
    }
  };
}

function migrateAdapterProfile(input = {}) {
  const source = isObject(input) ? input : {};
  if (safeString(source.schemaVersion) === SCHEMA_VERSION) {
    return normalizeAdapterProfile(source);
  }

  return normalizeAdapterProfile({
    schemaVersion: SCHEMA_VERSION,
    strictInputValidation: source.strictInputValidation,
    includeGenericUnknownNodes: source.includeGenericUnknownNodes,
    diagnostics: {
      ...(isObject(source.diagnostics) ? source.diagnostics : {}),
      warnings: [
        ...asArray(source?.diagnostics?.warnings),
        'Runtime graph adapter profile migrated from legacy format.'
      ]
    }
  });
}

function normalizeRuntimeGraphInput(input = {}) {
  if (isObject(input?.runtimeGraph) && Array.isArray(input.runtimeGraph.nodes)) {
    return {
      nodes: asArray(input.runtimeGraph.nodes),
      edges: asArray(input.runtimeGraph.edges)
    };
  }

  if (isObject(input?.graph) && typeof input.graph.toJSON === 'function') {
    const graphJson = input.graph.toJSON();
    return {
      nodes: asArray(graphJson?.nodes),
      edges: asArray(graphJson?.edges)
    };
  }

  if (Array.isArray(input?.nodes)) {
    return {
      nodes: asArray(input.nodes),
      edges: asArray(input.edges)
    };
  }

  return {
    nodes: [],
    edges: []
  };
}

function normalizeNode(node = {}, index = 0) {
  const source = isObject(node) ? node : {};
  const metadata = isObject(source.metadata) ? source.metadata : {};
  const properties = isObject(source.properties) ? source.properties : {};
  const runtimeData = isObject(source.runtimeData) ? source.runtimeData : {};

  return {
    id: safeString(source.id || `node-${index + 1}`) || `node-${index + 1}`,
    kind: safeString(source.kind || 'Generic') || 'Generic',
    sourceKey: toKebab(metadata.sourceKey || source.sourceKey || source.kind || 'generic-node') || 'generic-node',
    metadata,
    properties,
    runtimeData,
    parent: safeString(source.parent || ''),
    children: asArray(source.children)
  };
}

function resolveAdapterType(node = {}) {
  const sourceKey = toKebab(node.sourceKey || node.kind);

  if (sourceKey.includes('camera')) return 'camera';
  if (sourceKey.includes('environment')) return 'environment';
  if (sourceKey.includes('light')) return 'light';
  if (sourceKey === 'educationalobjects' || sourceKey === 'educationalobjectinstances' || sourceKey === 'objects') return 'educational-object';
  if (sourceKey.includes('label')) return 'label';
  if (sourceKey.includes('hotspot')) return 'hotspot';
  if (sourceKey.includes('animation')) return 'animation';
  if (sourceKey.includes('interaction')) return 'interaction';
  if (sourceKey.includes('timeline') || sourceKey.includes('track') || sourceKey.includes('step')) return 'timeline';
  if (sourceKey.includes('overlay')) return 'overlay';
  if (sourceKey.includes('uianchor') || sourceKey.includes('ui-anchor') || sourceKey.includes('anchor')) return 'ui-anchor';
  if (sourceKey.includes('checkpoint') || sourceKey.includes('marker')) return 'checkpoint';

  return 'generic-node';
}

function buildRendererObject(node = {}, adapterType = 'generic-node') {
  return {
    renderId: `render-${node.id}`,
    nodeId: node.id,
    adapterType,
    kind: node.kind,
    sourceKey: node.sourceKey,
    parent: node.parent || null,
    children: node.children,
    payload: {
      metadata: node.metadata,
      properties: node.properties,
      runtimeData: node.runtimeData
    }
  };
}

export class UniversalRuntimeGraphAdapter {
  constructor(options = {}) {
    this.options = isObject(options) ? options : {};
    this.profile = migrateAdapterProfile(this.options.profile || {});
    this.history = [];
  }

  validateInput(input = {}) {
    const source = isObject(input) ? input : {};
    const forbiddenFields = ['lessonText', 'aiResponse', 'sceneJson', 'templateJson'];
    const presentForbidden = forbiddenFields.filter((key) => source[key] !== undefined);
    const graph = normalizeRuntimeGraphInput(source);

    const errors = [];
    const warnings = [];

    if (!graph.nodes.length) {
      errors.push('Runtime graph input must contain nodes.');
    }

    if (presentForbidden.length) {
      warnings.push(`Forbidden direct renderer inputs detected and ignored: ${presentForbidden.join(', ')}`);
      if (this.profile.strictInputValidation) {
        errors.push('Strict input validation rejects forbidden direct renderer inputs.');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      graph,
      presentForbidden
    };
  }

  adapt(input = {}, options = {}) {
    this.profile.diagnostics.adaptations += 1;

    const validation = this.validateInput(input);
    if (!validation.valid) {
      return {
        status: 'rejected',
        valid: false,
        errors: validation.errors,
        warnings: validation.warnings,
        renderBundle: null
      };
    }

    const graph = validation.graph;
    const includeUnknown = options.includeGenericUnknownNodes !== false && this.profile.includeGenericUnknownNodes !== false;

    const normalizedNodes = graph.nodes.map((node, index) => normalizeNode(node, index));
    const rendererObjects = [];
    const byType = {};

    normalizedNodes.forEach((node) => {
      const adapterType = resolveAdapterType(node);
      if (adapterType === 'generic-node' && includeUnknown !== true) {
        return;
      }

      const rendererObject = buildRendererObject(node, adapterType);
      rendererObjects.push(rendererObject);

      if (!byType[adapterType]) {
        byType[adapterType] = [];
      }
      byType[adapterType].push(rendererObject);
    });

    const renderBundle = {
      schemaVersion: SCHEMA_VERSION,
      runtimeGraphSummary: {
        nodeCount: normalizedNodes.length,
        edgeCount: asArray(graph.edges).length
      },
      byType,
      rendererObjects,
      metadata: {
        supportsUnknownFutureNodeTypes: true,
        genericNodeCount: asArray(byType['generic-node']).length,
        forbiddenInputFieldsIgnored: validation.presentForbidden,
        adapterProfile: deepClone(this.profile)
      }
    };

    const report = {
      at: Date.now(),
      nodeCount: renderBundle.runtimeGraphSummary.nodeCount,
      edgeCount: renderBundle.runtimeGraphSummary.edgeCount,
      genericNodeCount: renderBundle.metadata.genericNodeCount,
      warnings: validation.warnings
    };

    this.history.push(report);
    if (this.history.length > 400) {
      this.history.shift();
    }

    validation.warnings.forEach((entry) => {
      this.profile.diagnostics.warnings.push(entry);
    });

    return {
      status: 'adapted',
      valid: true,
      errors: [],
      warnings: validation.warnings,
      renderBundle
    };
  }

  serialize() {
    return JSON.stringify({
      schemaVersion: SCHEMA_VERSION,
      profile: this.profile,
      history: this.history,
      persistedAt: Date.now()
    });
  }

  deserialize(serialized = '') {
    if (!serialized) return this.snapshot();

    let parsed = null;
    if (typeof serialized === 'string') {
      try {
        parsed = JSON.parse(serialized);
      } catch {
        parsed = null;
      }
    } else if (isObject(serialized)) {
      parsed = serialized;
    }

    if (!parsed) {
      this.profile.diagnostics.warnings.push('Failed to deserialize runtime graph adapter state.');
      return this.snapshot();
    }

    this.profile = migrateAdapterProfile(parsed.profile || {});
    this.profile.diagnostics.recoveries += 1;
    this.history = asArray(parsed.history);
    return this.snapshot();
  }

  snapshot() {
    return {
      schemaVersion: SCHEMA_VERSION,
      profile: this.profile,
      historySize: this.history.length,
      lastReport: this.history[this.history.length - 1] || null
    };
  }
}

export {
  normalizeAdapterProfile,
  migrateAdapterProfile,
  normalizeRuntimeGraphInput,
  normalizeNode,
  resolveAdapterType
};
