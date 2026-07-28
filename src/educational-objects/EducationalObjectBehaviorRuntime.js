import { createEducationalObjectBehaviorDiagnostics, finalizeEducationalObjectBehaviorDiagnostics } from './EducationalObjectBehaviorDiagnostics.js';
import { createEducationalObjectBehaviorRegistry } from './EducationalObjectBehaviorRegistry.js';
import { createEducationalObjectStateMachine } from './EducationalObjectStateMachine.js';
import { resolveEducationalObjectTriggers } from './EducationalObjectTriggerResolver.js';
import { resolveEducationalObjectEffects } from './EducationalObjectEffectResolver.js';
import { resolveEducationalObjectRelationships } from './EducationalObjectRelationshipResolver.js';
import { resolveEducationalObjectDependencies } from './EducationalObjectDependencyResolver.js';
import { resolveEducationalObjectBehaviorConflicts } from './EducationalObjectConflictResolver.js';
import { validateEducationalObjectBehavior } from './EducationalObjectBehaviorValidator.js';
import { repairEducationalObjectBehavior } from './EducationalObjectBehaviorRepair.js';

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function sanitizeSignal(signal = {}) {
  const source = signal && typeof signal === 'object' ? signal : {};
  const payload = source.payload && typeof source.payload === 'object' ? source.payload : {};

  function clean(value, depth = 0) {
    if (depth > 6) return '[truncated-depth]';
    if (value === null || value === undefined) return value;
    if (typeof value === 'function' || typeof value === 'symbol') return undefined;
    if (typeof value === 'string') {
      return String(value)
        .replace(/javascript:/gi, '')
        .replace(/data:text\/html/gi, '')
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .trim()
        .slice(0, 1000);
    }
    if (typeof value !== 'object') return value;
    if (Array.isArray(value)) return value.slice(0, 100).map((item) => clean(item, depth + 1)).filter((item) => item !== undefined);
    const output = Object.create(null);
    Object.entries(value).forEach(([key, nested]) => {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') return;
      const next = clean(nested, depth + 1);
      if (next !== undefined) output[key] = next;
    });
    return output;
  }

  return {
    signalId: String(source.signalId || `signal-${Date.now()}`),
    type: String(source.type || 'manual'),
    source: String(source.source || 'runtime'),
    sourceObjectId: source.sourceObjectId ? String(source.sourceObjectId) : null,
    targetObjectIds: toArray(source.targetObjectIds).map((id) => String(id || '').trim()).filter(Boolean),
    timelineStepId: source.timelineStepId ? String(source.timelineStepId) : null,
    interactionId: source.interactionId ? String(source.interactionId) : null,
    payload: clean(payload),
    timestamp: source.timestamp || Date.now(),
    metadata: clean(source.metadata || {})
  };
}

function evaluateCondition(condition = {}, context = {}) {
  const operator = String(condition.operator || '').trim();
  const field = String(condition.field || '').trim();
  if (!field || !operator) {
    return { met: false, unknownOperator: true, reason: 'missing-field-or-operator' };
  }

  const value = field.split('.').reduce((acc, key) => (acc && typeof acc === 'object' ? acc[key] : undefined), context);
  const expected = condition.expectedValue;

  switch (operator) {
    case 'equals': return { met: value === expected };
    case 'not-equals': return { met: value !== expected };
    case 'exists': return { met: value !== undefined && value !== null };
    case 'in': return { met: Array.isArray(expected) ? expected.includes(value) : false };
    case 'not-in': return { met: Array.isArray(expected) ? !expected.includes(value) : true };
    case 'greater-than': return { met: Number(value) > Number(expected) };
    case 'greater-than-or-equal': return { met: Number(value) >= Number(expected) };
    case 'less-than': return { met: Number(value) < Number(expected) };
    case 'less-than-or-equal': return { met: Number(value) <= Number(expected) };
    default:
      return { met: false, unknownOperator: true, reason: `unknown-operator:${operator}` };
  }
}

export function createEducationalObjectBehaviorRuntime(sceneRuntime = {}, options = {}) {
  const diagnostics = createEducationalObjectBehaviorDiagnostics();
  const registry = createEducationalObjectBehaviorRegistry();

  let loaded = false;
  let started = false;
  let paused = false;
  let destroyed = false;

  const sceneMetadata = sceneRuntime?.metadata && typeof sceneRuntime.metadata === 'object' ? sceneRuntime.metadata : {};
  const sceneJson = sceneRuntime?.sceneJson && typeof sceneRuntime.sceneJson === 'object' ? sceneRuntime.sceneJson : {};
  const objectInstances = toArray(sceneJson.educationalObjectInstances || sceneMetadata.educationalObjectInstances || []);
  const objectBehaviors = toArray(sceneMetadata.objectBehaviors || sceneJson.objectBehaviors || []);
  const objectRelationships = toArray(sceneMetadata.objectRelationships || sceneJson.objectRelationships || []);

  const stateMachines = new Map();
  const lastExecutionByBehavior = new Map();
  const executionCountByBehavior = new Map();
  const reversibleHistory = [];
  const redoHistory = [];

  const performance = {
    maximumEffectsPerDispatch: Math.max(1, Number(options.maximumEffectsPerDispatch || 100)),
    maximumAutomaticBehaviorChain: Math.max(1, Number(options.maximumAutomaticBehaviorChain || 25)),
    maximumStateHistory: Math.max(1, Number(options.maximumStateHistory || 50)),
    maximumRelationshipDepth: Math.max(1, Number(options.maximumRelationshipDepth || 20))
  };

  let relationshipBundle = resolveEducationalObjectRelationships(objectInstances, objectRelationships, {
    maximumRelationshipDepth: performance.maximumRelationshipDepth
  });

  let dependencyReport = null;
  let conflictReport = null;
  let latestEffectEvents = [];

  function updateDiagnostics(update = {}) {
    Object.assign(diagnostics, finalizeEducationalObjectBehaviorDiagnostics(diagnostics, update));
  }

  function buildRuntimeMetadataSummary() {
    const stateByObject = {};
    const availableStatesByObject = {};
    for (const [objectId, machine] of stateMachines.entries()) {
      const metadata = machine.getMetadata();
      stateByObject[objectId] = metadata.state;
      availableStatesByObject[objectId] = metadata.availableStates;
    }

    return {
      behaviorIds: registry.listBehaviors().map((behavior) => behavior.behaviorId),
      objectIds: objectInstances.map((instance) => String(instance?.objectId || instance?.id || '')).filter(Boolean),
      availableStatesByObject,
      timelineStepIds: toArray(sceneJson.timeline).map((step) => String(step?.id || '')).filter(Boolean),
      interactionIds: toArray(sceneJson.interactions).map((item) => String(item?.id || '')).filter(Boolean),
      stateByObject,
      behaviors: registry.listBehaviors()
    };
  }

  function writeBackRuntimeGraphMetadata(events = []) {
    const runtimeGraph = sceneRuntime?.graph;
    if (!runtimeGraph || typeof runtimeGraph.getNode !== 'function') return;

    for (const [objectId, machine] of stateMachines.entries()) {
      const node = runtimeGraph.getNode(objectId);
      if (!node) continue;
      const metadata = machine.getMetadata();
      node.runtimeData = {
        ...(node.runtimeData || {}),
        behaviorState: {
          currentState: metadata.state,
          availableStates: metadata.availableStates,
          completed: metadata.completed,
          disabled: metadata.disabled,
          paused: metadata.paused,
          validation: metadata.validation
        }
      };
      node.properties = {
        ...(node.properties || {}),
        behaviorState: node.runtimeData.behaviorState
      };
    }

    const sceneRoot = runtimeGraph.getNode(sceneRuntime?.sceneId || sceneJson.sceneId || '');
    if (sceneRoot) {
      sceneRoot.runtimeData = {
        ...(sceneRoot.runtimeData || {}),
        behaviorRuntime: {
          effectEvents: events,
          diagnosticsSummary: {
            warningCount: diagnostics.warnings.length,
            errorCount: diagnostics.errors.length,
            blockedBehaviors: diagnostics.counters.blockedBehaviors
          },
          relationships: relationshipBundle.graph.serializeGraph(),
          dependencyStatus: dependencyReport,
          conflictStatus: conflictReport,
          performance
        }
      };
      sceneRoot.properties = {
        ...(sceneRoot.properties || {}),
        behaviorRuntime: sceneRoot.runtimeData.behaviorRuntime
      };
    }
  }

  function evaluateBehaviorConditions(behavior, signalContext = {}) {
    const conditionResults = toArray(behavior.conditions).map((condition) => ({
      condition,
      evaluation: evaluateCondition(condition, signalContext)
    }));

    const unmetRequired = conditionResults.filter((entry) => entry.condition.required !== false && entry.evaluation.met !== true);
    const unknownOperatorCount = conditionResults.filter((entry) => entry.evaluation.unknownOperator === true).length;

    return {
      met: unmetRequired.length === 0,
      unknownOperatorCount,
      unmetRequired,
      details: conditionResults
    };
  }

  function canExecuteBehavior(behavior) {
    if (behavior.enabled === false) return { ok: false, reason: 'behavior-disabled' };

    const cooldownMs = Number(behavior.limits?.cooldownMs ?? behavior.cooldown ?? 0);
    const lastExecution = Number(lastExecutionByBehavior.get(behavior.behaviorId) || 0);
    if (cooldownMs > 0 && Date.now() - lastExecution < cooldownMs) {
      return { ok: false, reason: 'cooldown-active' };
    }

    const executions = Number(executionCountByBehavior.get(behavior.behaviorId) || 0);
    const maxExecutions = Number(behavior.limits?.maximumExecutions || 0);
    if (maxExecutions > 0 && executions >= maxExecutions) {
      return { ok: false, reason: 'maximum-executions-reached' };
    }

    if (behavior.limits?.once === true && executions > 0) {
      return { ok: false, reason: 'once-behavior-already-executed' };
    }

    return { ok: true, reason: 'ready' };
  }

  function load() {
    if (destroyed) return { ok: false, reason: 'destroyed' };

    const loadStartedAt = Date.now();

    objectInstances.forEach((instance) => {
      const objectId = String(instance?.objectId || instance?.id || '').trim();
      if (!objectId) return;
      const machine = createEducationalObjectStateMachine(instance, {
        maximumStateHistory: performance.maximumStateHistory
      });
      machine.initialize();
      stateMachines.set(objectId, machine);
    });

    const registrationResults = objectBehaviors.map((behavior) => {
      const repaired = repairEducationalObjectBehavior(behavior, options);
      const validation = validateEducationalObjectBehavior(repaired.behavior, options);
      return registry.registerBehavior(validation.normalizedValue, {
        source: 'scene-runtime',
        runtimeOnly: true,
        allowInvalid: false,
        metadata: {
          repaired: repaired.repaired,
          notes: repaired.notes,
          warnings: validation.warnings
        }
      });
    });

    dependencyReport = resolveEducationalObjectDependencies({
      ...buildRuntimeMetadataSummary(),
      behaviors: registry.listBehaviors()
    }, {
      maximumRelationshipDepth: performance.maximumRelationshipDepth,
      maximumDependencyDepth: performance.maximumRelationshipDepth
    });

    const blockedSet = new Set(dependencyReport.blockedBehaviors.map((item) => item.behaviorId));
    if (blockedSet.size) {
      registry.listBehaviors().forEach((behavior) => {
        if (blockedSet.has(behavior.behaviorId)) {
          registry.disableBehavior(behavior.behaviorId, behavior.version);
        }
      });
    }

    loaded = true;

    updateDiagnostics({
      status: 'loaded',
      counters: {
        behaviorsLoaded: registry.listBehaviors().length,
        stateMachines: stateMachines.size,
        relationships: relationshipBundle.relationships.length,
        unresolvedDependencies: dependencyReport.unresolvedDependencies.length,
        blockedBehaviors: dependencyReport.blockedBehaviors.length
      },
      timings: {
        loadMs: Date.now() - loadStartedAt
      },
      warnings: [
        ...registrationResults.flatMap((item) => item.validation?.warnings || []),
        ...(dependencyReport.warnings || [])
      ],
      errors: registrationResults.flatMap((item) => item.validation?.errors || [])
    });

    writeBackRuntimeGraphMetadata([]);

    return {
      ok: true,
      loadedBehaviors: registry.listBehaviors().length,
      blockedBehaviors: dependencyReport.blockedBehaviors
    };
  }

  function start() {
    if (destroyed) return { ok: false, reason: 'destroyed' };
    if (!loaded) load();
    started = true;
    paused = false;
    updateDiagnostics({ status: 'running' });
    return { ok: true };
  }

  function pause() {
    if (destroyed) return { ok: false, reason: 'destroyed' };
    paused = true;
    stateMachines.forEach((machine) => machine.pause());
    updateDiagnostics({ status: 'paused' });
    return { ok: true };
  }

  function resume() {
    if (destroyed) return { ok: false, reason: 'destroyed' };
    paused = false;
    stateMachines.forEach((machine) => machine.resume());
    updateDiagnostics({ status: 'running' });
    return { ok: true };
  }

  function reset() {
    if (destroyed) return { ok: false, reason: 'destroyed' };
    stateMachines.forEach((machine) => machine.reset());
    latestEffectEvents = [];
    reversibleHistory.length = 0;
    redoHistory.length = 0;
    updateDiagnostics({ status: 'loaded' });
    writeBackRuntimeGraphMetadata([]);
    return { ok: true };
  }

  function dispatch(signal = {}) {
    if (destroyed) return { ok: false, reason: 'destroyed', events: [] };
    if (!started || paused) return { ok: false, reason: paused ? 'paused' : 'not-started', events: [] };

    const dispatchStartedAt = Date.now();
    const sanitizedSignal = sanitizeSignal(signal);
    const behaviors = registry.listBehaviors().filter((behavior) => behavior.enabled !== false);
    const matched = resolveEducationalObjectTriggers(behaviors, sanitizedSignal, {
      signal: sanitizedSignal
    });

    const executionCandidates = [];
    const maxChain = performance.maximumAutomaticBehaviorChain;

    for (const match of matched.slice(0, maxChain)) {
      const behavior = registry.getBehavior(match.behaviorId);
      if (!behavior) continue;

      const executionCheck = canExecuteBehavior(behavior);
      if (!executionCheck.ok) {
        diagnostics.warnings.push(`Behavior ${behavior.behaviorId} skipped: ${executionCheck.reason}`);
        continue;
      }

      const conditionEvaluation = evaluateBehaviorConditions(behavior, {
        signal: sanitizedSignal,
        objectStates: Object.fromEntries([...stateMachines.entries()].map(([id, machine]) => [id, machine.getState()])),
        payload: sanitizedSignal.payload
      });

      if (conditionEvaluation.unknownOperatorCount > 0) {
        diagnostics.warnings.push(`Behavior ${behavior.behaviorId} has unknown operators treated as unmet.`);
      }

      if (!conditionEvaluation.met) {
        diagnostics.warnings.push(`Behavior ${behavior.behaviorId} conditions unmet.`);
        continue;
      }

      const reducedMotion = Object.values(Object.fromEntries([...stateMachines.entries()].map(([id, machine]) => [id, machine.getMetadata()])))
        .some((meta) => meta?.reducedMotion === true);
      const effects = resolveEducationalObjectEffects(behavior, {
        maximumEffectsPerDispatch: performance.maximumEffectsPerDispatch,
        reducedMotion
      });

      executionCandidates.push({
        behaviorId: behavior.behaviorId,
        priority: Number(behavior.priority || 0),
        effects,
        required: toArray(behavior.relationshipRequirements).some((item) => item?.required === true),
        behavior
      });
    }

    conflictReport = resolveEducationalObjectBehaviorConflicts(executionCandidates, {
      strategy: options.conflictStrategy || 'priority'
    });

    const events = [];
    conflictReport.resolved.forEach((execution) => {
      const behavior = registry.getBehavior(execution.behaviorId);
      if (!behavior) return;

      toArray(execution.effects).forEach((effect) => {
        const targets = toArray(effect.targetObjectIds);
        if (!targets.length && effect.requestedState) {
          // If no explicit targets are provided, use source object for state change semantics.
          if (sanitizedSignal.sourceObjectId) targets.push(sanitizedSignal.sourceObjectId);
        }

        const previousStates = [];
        targets.forEach((objectId) => {
          const machine = stateMachines.get(objectId);
          if (!machine) return;
          if (effect.requestedState && machine.canTransition(effect.requestedState)) {
            previousStates.push({ objectId, state: machine.getState() });
            machine.transition(effect.requestedState, { metadata: { sourceBehaviorId: behavior.behaviorId } });
          }
        });

        events.push({
          ...effect,
          sourceBehaviorId: behavior.behaviorId,
          metadata: {
            ...(effect.metadata || {}),
            signalId: sanitizedSignal.signalId,
            timestamp: Date.now()
          }
        });

        if (effect.reversible === true || behavior.reversible === true) {
          reversibleHistory.push({
            behaviorId: behavior.behaviorId,
            event: effect,
            previousStates
          });
          if (reversibleHistory.length > performance.maximumStateHistory) {
            reversibleHistory.splice(0, reversibleHistory.length - performance.maximumStateHistory);
          }
          redoHistory.length = 0;
        }
      });

      const count = Number(executionCountByBehavior.get(behavior.behaviorId) || 0) + 1;
      executionCountByBehavior.set(behavior.behaviorId, count);
      lastExecutionByBehavior.set(behavior.behaviorId, Date.now());
    });

    latestEffectEvents = events;

    updateDiagnostics({
      status: 'running',
      counters: {
        ...diagnostics.counters,
        eventsEmitted: Number(diagnostics.counters.eventsEmitted || 0) + events.length,
        conflicts: conflictReport.conflicts.length
      },
      timings: {
        ...diagnostics.timings,
        dispatchMs: Date.now() - dispatchStartedAt
      },
      warnings: conflictReport.conflicts.filter((conflict) => !conflict.required).map((conflict) => `Conflict resolved: ${conflict.key}`),
      errors: conflictReport.requiredConflicts.map((conflict) => `Required conflict: ${conflict.key}`)
    });

    writeBackRuntimeGraphMetadata(events);

    return {
      ok: true,
      events,
      diagnostics: diagnostics
    };
  }

  function canUndo() {
    return !destroyed && reversibleHistory.length > 0;
  }

  function undo() {
    if (destroyed) return { ok: false, reason: 'destroyed' };
    if (!reversibleHistory.length) return { ok: false, reason: 'empty-history' };

    const entry = reversibleHistory.pop();
    const failures = [];
    entry.previousStates.forEach((snapshot) => {
      const machine = stateMachines.get(snapshot.objectId);
      if (!machine) {
        failures.push({ objectId: snapshot.objectId, reason: 'missing-state-machine' });
        return;
      }
      if (!machine.canTransition(snapshot.state)) {
        failures.push({ objectId: snapshot.objectId, reason: 'cannot-transition-back' });
        return;
      }
      machine.transition(snapshot.state, { metadata: { undo: true, sourceBehaviorId: entry.behaviorId } });
    });

    redoHistory.push(entry);
    writeBackRuntimeGraphMetadata(latestEffectEvents);
    if (failures.length) diagnostics.warnings.push(`Undo completed with ${failures.length} reversal failure(s).`);

    return { ok: failures.length === 0, failures };
  }

  function canRedo() {
    return !destroyed && redoHistory.length > 0;
  }

  function redo() {
    if (destroyed) return { ok: false, reason: 'destroyed' };
    if (!redoHistory.length) return { ok: false, reason: 'empty-redo' };

    const entry = redoHistory.pop();
    reversibleHistory.push(entry);

    const event = {
      ...entry.event,
      metadata: {
        ...(entry.event.metadata || {}),
        redo: true
      }
    };
    latestEffectEvents = [...latestEffectEvents, event].slice(-performance.maximumEffectsPerDispatch);
    writeBackRuntimeGraphMetadata(latestEffectEvents);

    return { ok: true, event };
  }

  function clearHistory() {
    reversibleHistory.length = 0;
    redoHistory.length = 0;
    return { ok: true };
  }

  function getObjectState(objectId) {
    const machine = stateMachines.get(String(objectId || '').trim());
    if (!machine) return null;
    return {
      state: machine.getState(),
      history: machine.getStateHistory(),
      metadata: machine.getMetadata()
    };
  }

  function getRelationshipState(relationshipId) {
    return relationshipBundle.graph.getRelationship(String(relationshipId || '').trim());
  }

  function getDiagnostics() {
    return {
      ...diagnostics,
      dependencyReport,
      conflictReport
    };
  }

  function destroy() {
    destroyed = true;
    started = false;
    paused = false;
    loaded = false;

    stateMachines.forEach((machine) => machine.destroy());
    stateMachines.clear();

    registry.clearRuntimeBehaviors();
    latestEffectEvents = [];
    reversibleHistory.length = 0;
    redoHistory.length = 0;
    updateDiagnostics({ status: 'destroyed' });

    return { ok: true };
  }

  return {
    load,
    start,
    pause,
    resume,
    reset,
    dispatch,
    getObjectState,
    getRelationshipState,
    getDiagnostics,
    destroy,
    canUndo,
    undo,
    canRedo,
    redo,
    clearHistory,
    getLatestEffectEvents() {
      return [...latestEffectEvents];
    }
  };
}
