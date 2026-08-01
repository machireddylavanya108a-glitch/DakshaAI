import {
  migrateUniversalAssetContract,
  normalizeUniversalAssetContract,
  validateUniversalAssetContract
} from './UniversalAssetContract.js';

const STORE_KEY = '__daksha_universal_asset_registry_store__';
const REGISTRY_SCHEMA_VERSION = 'v2';
const DEFAULT_PERSISTENCE_KEY = 'daksha.universal.asset.registry.v2';

function safeString(value) {
  return String(value || '').trim();
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function parsePayload(value) {
  if (!value) return null;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  return isObject(value) ? value : null;
}

function createInMemoryStore() {
  if (!globalThis[STORE_KEY]) {
    globalThis[STORE_KEY] = new Map();
  }

  const map = globalThis[STORE_KEY];
  return {
    setItem(key, value) {
      map.set(String(key), String(value));
    },
    getItem(key) {
      return map.get(String(key)) || null;
    },
    removeItem(key) {
      map.delete(String(key));
    }
  };
}

function createDefaultPersistenceAdapter() {
  const local = globalThis?.localStorage;
  if (local && typeof local.getItem === 'function' && typeof local.setItem === 'function') {
    return local;
  }
  return createInMemoryStore();
}

function versionWeight(version = 'v1') {
  const normalized = safeString(version).toLowerCase();
  const match = normalized.match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : 0;
}

function compareVersions(a = 'v1', b = 'v1') {
  return versionWeight(a) - versionWeight(b);
}

function buildContractKey(id = '', version = 'v1') {
  return `${safeString(id)}::${safeString(version || 'v1') || 'v1'}`;
}

function stableSortContracts(list = []) {
  return [...list].sort((left, right) => {
    const idCompare = safeString(left.id).localeCompare(safeString(right.id));
    if (idCompare !== 0) return idCompare;
    return compareVersions(right.version, left.version);
  });
}

function buildDependencyGraph(contracts = []) {
  const graph = new Map();
  stableSortContracts(contracts).forEach((contract) => {
    const key = buildContractKey(contract.id, contract.version);
    graph.set(key, asArray(contract.dependencies).map((dependency) => ({
      assetId: safeString(dependency.assetId),
      version: safeString(dependency.version || 'latest') || 'latest',
      required: dependency.required !== false,
      role: safeString(dependency.role || 'supporting') || 'supporting'
    })));
  });
  return graph;
}

function detectCycles(graph = new Map()) {
  const visited = new Set();
  const stack = new Set();
  const cycles = [];

  const hasNode = (assetId, version) => {
    if (!assetId) return false;
    if (version === 'latest') {
      return [...graph.keys()].some((key) => key.startsWith(`${assetId}::`));
    }
    return graph.has(buildContractKey(assetId, version));
  };

  const nextNodes = (nodeKey) => {
    const dependencies = graph.get(nodeKey) || [];
    return dependencies
      .filter((dependency) => hasNode(dependency.assetId, dependency.version))
      .map((dependency) => {
        if (dependency.version === 'latest') {
          const options = [...graph.keys()].filter((key) => key.startsWith(`${dependency.assetId}::`));
          return options[0] || null;
        }
        return buildContractKey(dependency.assetId, dependency.version);
      })
      .filter(Boolean);
  };

  const dfs = (nodeKey, trail = []) => {
    if (stack.has(nodeKey)) {
      cycles.push([...trail, nodeKey]);
      return;
    }

    if (visited.has(nodeKey)) return;
    visited.add(nodeKey);
    stack.add(nodeKey);

    nextNodes(nodeKey).forEach((next) => dfs(next, [...trail, nodeKey]));
    stack.delete(nodeKey);
  };

  [...graph.keys()].forEach((key) => dfs(key, []));
  return cycles;
}

export class UniversalAssetRegistry {
  constructor(options = {}) {
    this.options = isObject(options) ? options : {};
    this.persistenceAdapter = this.options.persistenceAdapter || createDefaultPersistenceAdapter();
    this.persistenceKey = safeString(this.options.persistenceKey) || DEFAULT_PERSISTENCE_KEY;
    this.entries = new Map();
    this.indexById = new Map();
    this.registryVersion = 1;
    this.diagnostics = {
      registrations: 0,
      unregistrations: 0,
      lookups: 0,
      searches: 0,
      filters: 0,
      dependencyResolutions: 0,
      conflicts: [],
      warnings: [],
      recoveries: 0
    };

    this.recover();
  }

  warn(message = 'Unknown warning') {
    this.diagnostics.warnings.push(safeString(message));
    if (this.diagnostics.warnings.length > 300) {
      this.diagnostics.warnings.shift();
    }
  }

  noteConflict(type, metadata = {}) {
    this.diagnostics.conflicts.push({
      type: safeString(type) || 'conflict',
      metadata: isObject(metadata) ? metadata : {},
      at: Date.now()
    });

    if (this.diagnostics.conflicts.length > 300) {
      this.diagnostics.conflicts.shift();
    }
  }

  touchRegistryVersion() {
    this.registryVersion += 1;
  }

  register(input = {}, options = {}) {
    const validation = validateUniversalAssetContract(input);
    const contract = validation.contract;

    if (!validation.valid) {
      this.noteConflict('invalid-contract-registration', {
        id: contract.id,
        version: contract.version,
        errors: validation.errors
      });
      return {
        status: 'rejected',
        contract,
        errors: validation.errors,
        warnings: validation.warnings
      };
    }

    const key = buildContractKey(contract.id, contract.version);
    const exists = this.entries.has(key);
    if (exists && options.allowUpdate !== true) {
      this.noteConflict('duplicate-asset-contract', {
        id: contract.id,
        version: contract.version
      });
      return {
        status: 'duplicate',
        contract,
        errors: ['Asset contract already exists for id/version. Use allowUpdate=true to replace.'],
        warnings: validation.warnings
      };
    }

    this.entries.set(key, contract);

    const versions = this.indexById.get(contract.id) || [];
    const nextVersions = versions.filter((value) => safeString(value) !== safeString(contract.version));
    nextVersions.push(contract.version);
    nextVersions.sort((left, right) => compareVersions(right, left));
    this.indexById.set(contract.id, nextVersions);

    this.diagnostics.registrations += 1;
    this.touchRegistryVersion();

    if (validation.warnings.length) {
      validation.warnings.forEach((warning) => this.warn(warning));
    }

    return {
      status: exists ? 'updated' : 'registered',
      contract,
      errors: [],
      warnings: validation.warnings
    };
  }

  unregister(id = '', version = 'latest') {
    const assetId = safeString(id);
    if (!assetId) {
      return { status: 'rejected', removed: false, reason: 'missing-id' };
    }

    const resolvedVersion = safeString(version || 'latest') || 'latest';
    const targetVersion = resolvedVersion === 'latest' ? this.getLatestVersion(assetId) : resolvedVersion;
    if (!targetVersion) {
      return { status: 'missing', removed: false, reason: 'not-found' };
    }

    const key = buildContractKey(assetId, targetVersion);
    if (!this.entries.has(key)) {
      return { status: 'missing', removed: false, reason: 'not-found' };
    }

    this.entries.delete(key);
    const versions = (this.indexById.get(assetId) || []).filter((entry) => safeString(entry) !== targetVersion);
    if (versions.length) {
      this.indexById.set(assetId, versions);
    } else {
      this.indexById.delete(assetId);
    }

    this.diagnostics.unregistrations += 1;
    this.touchRegistryVersion();

    return {
      status: 'removed',
      removed: true,
      id: assetId,
      version: targetVersion
    };
  }

  getLatestVersion(id = '') {
    const versions = this.indexById.get(safeString(id)) || [];
    if (!versions.length) return null;
    return [...versions].sort((left, right) => compareVersions(right, left))[0];
  }

  lookup(id = '', version = 'latest') {
    this.diagnostics.lookups += 1;
    const assetId = safeString(id);
    if (!assetId) return null;

    const targetVersion = safeString(version || 'latest') || 'latest';
    const resolvedVersion = targetVersion === 'latest' ? this.getLatestVersion(assetId) : targetVersion;
    if (!resolvedVersion) return null;

    const key = buildContractKey(assetId, resolvedVersion);
    const contract = this.entries.get(key);
    return contract ? deepClone(contract) : null;
  }

  listContracts(options = {}) {
    const includeDeprecated = options.includeDeprecated === true;
    const list = stableSortContracts([...this.entries.values()]);
    if (includeDeprecated) return deepClone(list);
    return deepClone(list.filter((entry) => entry?.metadata?.deprecated !== true));
  }

  listVersions(id = '') {
    const versions = this.indexById.get(safeString(id)) || [];
    return deepClone([...versions].sort((left, right) => compareVersions(right, left)));
  }

  search(query = '', options = {}) {
    this.diagnostics.searches += 1;
    const tokens = safeString(query).toLowerCase().split(/\s+/).filter(Boolean);
    const contracts = this.listContracts(options);
    if (!tokens.length) return contracts;

    return contracts.filter((contract) => {
      const searchable = [
        contract.id,
        contract.type,
        contract.category,
        contract.source,
        ...asArray(contract.tags),
        ...asArray(contract.capabilities)
      ].join(' ').toLowerCase();

      return tokens.every((token) => searchable.includes(token));
    });
  }

  filter(criteria = {}, options = {}) {
    this.diagnostics.filters += 1;
    const source = isObject(criteria) ? criteria : {};
    const contracts = this.listContracts(options);

    return contracts.filter((contract) => {
      if (source.type && safeString(contract.type).toLowerCase() !== safeString(source.type).toLowerCase()) return false;
      if (source.category && safeString(contract.category).toLowerCase() !== safeString(source.category).toLowerCase()) return false;
      if (source.tag && !asArray(contract.tags).some((tag) => safeString(tag).toLowerCase() === safeString(source.tag).toLowerCase())) return false;
      if (source.capability && !asArray(contract.capabilities).some((value) => safeString(value).toLowerCase() === safeString(source.capability).toLowerCase())) return false;
      if (source.source && safeString(contract.source).toLowerCase() !== safeString(source.source).toLowerCase()) return false;
      return true;
    });
  }

  resolveDependencies(id = '', version = 'latest', options = {}) {
    this.diagnostics.dependencyResolutions += 1;
    const root = this.lookup(id, version);
    if (!root) {
      return {
        status: 'missing',
        root: null,
        resolved: [],
        missing: [{ assetId: safeString(id), version: safeString(version || 'latest') || 'latest' }],
        cycles: []
      };
    }

    const graph = buildDependencyGraph(this.listContracts({ includeDeprecated: options.includeDeprecated === true }));
    const cycles = detectCycles(graph);
    if (cycles.length) {
      this.noteConflict('asset-dependency-cycle-detected', {
        cycleCount: cycles.length,
        rootId: root.id,
        rootVersion: root.version
      });
    }

    const resolved = [];
    const missing = [];
    const visited = new Set();

    const visit = (contract) => {
      const key = buildContractKey(contract.id, contract.version);
      if (visited.has(key)) return;
      visited.add(key);

      asArray(contract.dependencies).forEach((dependency) => {
        const next = this.lookup(dependency.assetId, dependency.version || 'latest');
        if (!next) {
          missing.push({
            assetId: safeString(dependency.assetId),
            version: safeString(dependency.version || 'latest') || 'latest',
            required: dependency.required !== false
          });
          return;
        }
        resolved.push(next);
        visit(next);
      });
    };

    visit(root);

    return {
      status: missing.some((entry) => entry.required !== false) ? 'partial' : 'resolved',
      root,
      resolved: stableSortContracts(resolved),
      missing,
      cycles
    };
  }

  getDiagnostics() {
    return {
      schemaVersion: REGISTRY_SCHEMA_VERSION,
      registryVersion: this.registryVersion,
      contractCount: this.entries.size,
      assetCount: this.indexById.size,
      ...deepClone(this.diagnostics)
    };
  }

  exportSnapshot() {
    return {
      schemaVersion: REGISTRY_SCHEMA_VERSION,
      registryVersion: this.registryVersion,
      entries: this.listContracts({ includeDeprecated: true }),
      diagnostics: this.getDiagnostics(),
      exportedAt: Date.now()
    };
  }

  importSnapshot(snapshot = {}) {
    const source = parsePayload(snapshot) || {};
    const entries = asArray(source.entries).map((entry) => migrateUniversalAssetContract(entry));

    this.entries = new Map();
    this.indexById = new Map();
    entries.forEach((entry) => {
      const key = buildContractKey(entry.id, entry.version);
      this.entries.set(key, normalizeUniversalAssetContract(entry));
      const versions = this.indexById.get(entry.id) || [];
      versions.push(entry.version);
      versions.sort((left, right) => compareVersions(right, left));
      this.indexById.set(entry.id, [...new Set(versions)]);
    });

    this.registryVersion = Math.max(1, Number(source.registryVersion || this.registryVersion || 1));
    this.diagnostics.recoveries += 1;
    return this.exportSnapshot();
  }

  serialize() {
    return JSON.stringify(this.exportSnapshot());
  }

  deserialize(serialized = '') {
    const parsed = parsePayload(serialized);
    if (!parsed) {
      this.warn('Failed to deserialize asset registry snapshot.');
      return this.exportSnapshot();
    }

    return this.importSnapshot(parsed);
  }

  persist() {
    if (!this.persistenceAdapter) return false;
    const serialized = this.serialize();

    if (typeof this.persistenceAdapter.setItem === 'function') {
      this.persistenceAdapter.setItem(this.persistenceKey, serialized);
      return true;
    }

    if (typeof this.persistenceAdapter.save === 'function') {
      this.persistenceAdapter.save(this.persistenceKey, serialized);
      return true;
    }

    return false;
  }

  recover() {
    if (!this.persistenceAdapter) return false;
    let raw = null;

    if (typeof this.persistenceAdapter.getItem === 'function') {
      raw = this.persistenceAdapter.getItem(this.persistenceKey);
    } else if (typeof this.persistenceAdapter.load === 'function') {
      raw = this.persistenceAdapter.load(this.persistenceKey);
    }

    if (!raw) return false;

    const parsed = parsePayload(raw);
    if (!parsed) {
      this.warn('Corrupted persisted asset registry snapshot.');
      return false;
    }

    this.importSnapshot(parsed);
    return true;
  }
}

let defaultRegistry = null;

export function createUniversalAssetRegistry(options = {}) {
  return new UniversalAssetRegistry(options);
}

export function getDefaultUniversalAssetRegistry(options = {}) {
  if (!defaultRegistry) {
    defaultRegistry = createUniversalAssetRegistry(options);
  }
  return defaultRegistry;
}

export function restoreUniversalAssetRegistry(serialized = '', options = {}) {
  const registry = createUniversalAssetRegistry(options);
  registry.deserialize(serialized);
  return registry;
}
