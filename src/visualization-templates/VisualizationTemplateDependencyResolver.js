function normalizeToken(value = '') {
  return String(value || '').trim();
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function createDependencyNode(template = {}) {
  return {
    templateId: normalizeToken(template.templateId),
    version: normalizeToken(template.version),
    dependencies: toArray(template.metadata?.dependencies).map((dependency) => ({
      templateId: normalizeToken(dependency?.templateId),
      version: normalizeToken(dependency?.version),
      required: dependency?.required !== false
    })).filter((dependency) => dependency.templateId)
  };
}

function entryLookup(registry, templateId, version, allowDeprecated = false) {
  if (!registry || typeof registry.listTemplates !== 'function') return null;
  const entries = registry.listTemplates({ includeDisabled: true, includeDeprecated: true });

  const match = entries
    .filter((entry) => entry.templateId === templateId)
    .filter((entry) => !version || entry.version === version)
    .filter((entry) => entry.enabled)
    .filter((entry) => allowDeprecated || !entry.deprecated)
    .sort((left, right) => Number(String(right.version).replace(/^v/i, '')) - Number(String(left.version).replace(/^v/i, '')))[0];

  return match || null;
}

export function resolveTemplateDependencies(templates = [], registry, context = {}, options = {}) {
  const maxDepth = Math.max(1, Number(options.maxDepth || 6));
  const allowDeprecated = options.allowDeprecated === true;

  const queue = (Array.isArray(templates) ? templates : []).map((template) => ({
    template,
    depth: 0
  }));

  const resolved = [];
  const resolvedKeys = new Set();
  const missingDependencies = [];
  const circularDependencies = [];
  const warnings = [];

  while (queue.length) {
    const current = queue.shift();
    if (!current || !current.template) continue;

    const node = createDependencyNode(current.template);
    const key = `${node.templateId}::${node.version}`;
    if (resolvedKeys.has(key)) continue;

    if (current.depth > maxDepth) {
      warnings.push(`dependency-depth-limit:${key}`);
      continue;
    }

    resolved.push(current.template);
    resolvedKeys.add(key);

    node.dependencies.forEach((dependency) => {
      const dependencyKey = `${dependency.templateId}::${dependency.version || '*'}`;
      if (resolvedKeys.has(`${dependency.templateId}::${dependency.version}`) || resolvedKeys.has(`${dependency.templateId}::`)) {
        circularDependencies.push({ from: key, to: dependencyKey, type: 'circular' });
        return;
      }

      const lookup = entryLookup(registry, dependency.templateId, dependency.version, allowDeprecated);
      if (!lookup) {
        if (dependency.required) {
          missingDependencies.push({ from: key, dependency: dependencyKey, required: true });
        } else {
          warnings.push(`optional-dependency-missing:${dependencyKey}`);
        }
        return;
      }

      queue.push({
        template: lookup.template,
        depth: current.depth + 1
      });
    });
  }

  return {
    templates: resolved,
    dependencies: resolved.map((template) => ({
      templateId: template.templateId,
      version: template.version,
      dependencies: toArray(template.metadata?.dependencies)
    })),
    missingDependencies,
    circularDependencies,
    warnings,
    diagnostics: {
      dependencyCount: resolved.reduce((sum, template) => sum + toArray(template.metadata?.dependencies).length, 0),
      missingDependencyCount: missingDependencies.length,
      circularDependencyCount: circularDependencies.length,
      maxDepth
    }
  };
}
