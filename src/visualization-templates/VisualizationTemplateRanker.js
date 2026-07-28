function normalizeToken(value = '') {
  return String(value || '').trim().toLowerCase();
}

function parseVersionWeight(version = '') {
  const normalized = String(version || '').replace(/^v/i, '').trim();
  const numeric = Number(normalized);
  return Number.isFinite(numeric) ? numeric : 0;
}

function safeNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

export function rankVisualizationTemplates(candidates = [], context = {}, options = {}) {
  const maxResults = Math.max(1, Number(options.maxResults || 12));

  const eligible = (Array.isArray(candidates) ? candidates : []).filter((candidate) => {
    if (candidate?.eligibility?.eligible === false) return false;
    const score = safeNumber(candidate?.score?.normalizedScore, -1);
    return score >= 0;
  });

  const sorted = [...eligible].sort((left, right) => {
    const leftScore = safeNumber(left?.score?.normalizedScore, 0);
    const rightScore = safeNumber(right?.score?.normalizedScore, 0);
    if (rightScore !== leftScore) return rightScore - leftScore;

    const leftUnresolved = (left?.unresolvedRequirements || []).length;
    const rightUnresolved = (right?.unresolvedRequirements || []).length;
    if (leftUnresolved !== rightUnresolved) return leftUnresolved - rightUnresolved;

    const leftAccessibility = safeNumber(left?.accessibilityMatches?.coverage, 0);
    const rightAccessibility = safeNumber(right?.accessibilityMatches?.coverage, 0);
    if (rightAccessibility !== leftAccessibility) return rightAccessibility - leftAccessibility;

    const leftPerformance = safeNumber(left?.performanceMatches?.coverage, 0);
    const rightPerformance = safeNumber(right?.performanceMatches?.coverage, 0);
    if (rightPerformance !== leftPerformance) return rightPerformance - leftPerformance;

    const leftVersion = parseVersionWeight(left?.template?.version || left?.registryEntry?.version || '');
    const rightVersion = parseVersionWeight(right?.template?.version || right?.registryEntry?.version || '');
    if (rightVersion !== leftVersion) return rightVersion - leftVersion;

    const leftTrust = safeNumber(left?.registryEntry?.trustLevel, 0.5);
    const rightTrust = safeNumber(right?.registryEntry?.trustLevel, 0.5);
    if (rightTrust !== leftTrust) return rightTrust - leftTrust;

    const leftId = normalizeToken(left?.template?.templateId || left?.registryEntry?.templateId || '');
    const rightId = normalizeToken(right?.template?.templateId || right?.registryEntry?.templateId || '');
    if (leftId !== rightId) return leftId.localeCompare(rightId);

    const leftKey = normalizeToken(left?.registryEntry?.key || '');
    const rightKey = normalizeToken(right?.registryEntry?.key || '');
    return leftKey.localeCompare(rightKey);
  });

  return {
    ranked: sorted.slice(0, maxResults),
    totalRanked: sorted.length,
    diagnostics: {
      requestedLimit: maxResults,
      candidateCount: candidates.length,
      eligibleCount: eligible.length
    }
  };
}
