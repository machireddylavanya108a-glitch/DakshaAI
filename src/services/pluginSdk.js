export function createPluginDefinition(definition) {
  return {
    id: definition.id || `plugin-${Date.now()}`,
    name: definition.name || 'Untitled Plugin',
    version: definition.version || '1.0.0',
    type: definition.type || 'tool',
    tags: definition.tags || [],
    permissions: definition.permissions || ['read'],
    targets: definition.targets || ['Dashboard'],
    sandboxed: definition.sandboxed !== false,
    manifest: definition.manifest || {}
  };
}

export function createAgentDefinition(definition) {
  return {
    id: definition.id || `agent-${Date.now()}`,
    name: definition.name || 'Untitled Agent',
    role: definition.role || 'assistant',
    capabilities: definition.capabilities || [],
    language: definition.language || 'English',
    verified: false
  };
}
