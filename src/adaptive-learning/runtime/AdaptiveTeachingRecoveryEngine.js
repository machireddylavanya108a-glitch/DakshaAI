import {
  DEFAULT_ADAPTIVE_ENGINE_CONFIG,
  LEARNING_MODES,
  asArray,
  clamp,
  isObject,
  toFiniteNumber
} from './AdaptiveTeachingRuntimeConfig.js';

const STORE_KEY = '__daksha_adaptive_learning_runtime_store__';

function createInMemoryStore() {
  if (!globalThis[STORE_KEY]) {
    globalThis[STORE_KEY] = new Map();
  }

  const store = globalThis[STORE_KEY];
  return {
    setItem(key, value) {
      store.set(String(key), String(value));
    },
    getItem(key) {
      return store.get(String(key)) || null;
    },
    removeItem(key) {
      store.delete(String(key));
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

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function createChannelSet() {
  return new Map();
}

function safeEmit(listenersMap, channel, payload) {
  const listeners = listenersMap.get(channel);
  if (!listeners || listeners.size === 0) return;

  listeners.forEach((listener) => {
    try {
      listener(payload);
    } catch {
      // Listener failures are isolated from adaptive learning runtime flow.
    }
  });
}

function getRuntimeTimeMs(scheduler) {
  const snapshot = scheduler?.snapshot?.() || {};
  return Math.max(0, toFiniteNumber(snapshot?.clock?.timeMs, 0));
}

function getProgressSummary(runtime = {}, scheduler = null) {
  const progressTracker = runtime?.progressTracker;
  if (progressTracker && typeof progressTracker.getSnapshot === 'function') {
    const snapshot = progressTracker.getSnapshot();
    return {
      progressPercent: clamp(toFiniteNumber(snapshot?.progressPercent, 0), 0, 100),
      completedUnits: Math.max(0, toFiniteNumber(snapshot?.completedUnits, 0)),
      totalUnits: Math.max(1, toFiniteNumber(snapshot?.totalUnits, 1))
    };
  }

  const schedulerSnapshot = scheduler?.snapshot?.() || {};
  const cursor = schedulerSnapshot?.cursor || {};
  return {
    progressPercent: clamp(toFiniteNumber(cursor?.progress, 0) * 100, 0, 100),
    completedUnits: Math.max(0, toFiniteNumber(cursor?.progress, 0) > 0 ? 1 : 0),
    totalUnits: 1
  };
}

function buildModeProfile(mode = 'intermediate', customModes = {}) {
  const normalizedMode = String(mode || '').trim().toLowerCase() || 'intermediate';
  const known = LEARNING_MODES.includes(normalizedMode);

  const builtIn = {
    beginner: {
      explanationDepth: 0.35,
      pacing: 0.7,
      examplesIntensity: 0.9,
      complexity: 0.3
    },
    intermediate: {
      explanationDepth: 0.55,
      pacing: 1,
      examplesIntensity: 0.7,
      complexity: 0.55
    },
    advanced: {
      explanationDepth: 0.75,
      pacing: 1.15,
      examplesIntensity: 0.5,
      complexity: 0.8
    },
    'exam-preparation': {
      explanationDepth: 0.7,
      pacing: 1.1,
      examplesIntensity: 0.6,
      complexity: 0.85
    },
    'interview-preparation': {
      explanationDepth: 0.72,
      pacing: 1.1,
      examplesIntensity: 0.55,
      complexity: 0.82
    },
    'project-based-learning': {
      explanationDepth: 0.65,
      pacing: 1,
      examplesIntensity: 0.8,
      complexity: 0.72
    },
    'research-mode': {
      explanationDepth: 0.8,
      pacing: 1.05,
      examplesIntensity: 0.45,
      complexity: 0.9
    }
  };

  if (isObject(customModes[normalizedMode])) {
    return {
      mode: normalizedMode,
      knownMode: known,
      ...customModes[normalizedMode]
    };
  }

  if (builtIn[normalizedMode]) {
    return {
      mode: normalizedMode,
      knownMode: known,
      ...builtIn[normalizedMode]
    };
  }

  return {
    mode: normalizedMode,
    knownMode: false,
    explanationDepth: 0.55,
    pacing: 1,
    examplesIntensity: 0.7,
    complexity: 0.55
  };
}

function normalizeRuntimeSignalStore(runtime = {}) {
  if (!isObject(runtime.metadata)) {
    runtime.metadata = {};
  }

  if (!Array.isArray(runtime.metadata.quizResults)) {
    runtime.metadata.quizResults = [];
  }

  if (!Array.isArray(runtime.metadata.interactionHistory)) {
    runtime.metadata.interactionHistory = [];
  }
}

function buildQuestion(questionType, segment, level, index) {
  const objective = String(segment?.learningObjective || segment?.text || 'current concept').trim();
  const focus = objective || 'the current concept';
  return {
    id: `${questionType}-${index + 1}-${String(segment?.id || 'segment')}`,
    type: questionType,
    difficulty: level,
    prompt: `How would you explain ${focus} based on this lesson step?`,
    segmentId: segment?.id || null,
    metadata: {
      objective: focus,
      mode: level,
      source: 'adaptive-teaching-runtime'
    }
  };
}

function buildQuestionBundle(segments = [], complexity = 0.5) {
  const baseLevel = complexity > 0.75 ? 'advanced' : complexity > 0.45 ? 'intermediate' : 'beginner';
  const selectedSegments = segments.length ? segments.slice(0, 3) : [{ id: 'generic-segment', text: 'Current lesson concept.' }];

  return {
    comprehensionQuestions: selectedSegments.map((segment, index) => buildQuestion('comprehension', segment, baseLevel, index)),
    practiceQuestions: selectedSegments.map((segment, index) => buildQuestion('practice', segment, baseLevel, index)),
    recapQuestions: selectedSegments.map((segment, index) => buildQuestion('recap', segment, baseLevel, index)),
    challengeQuestions: selectedSegments.map((segment, index) => buildQuestion('challenge', segment, 'advanced', index)),
    revisionCheckpoints: selectedSegments.map((segment, index) => ({
      id: `revision-checkpoint-${index + 1}-${segment.id}`,
      segmentId: segment.id,
      recommendation: 'review-if-needed',
      priority: index + 1
    }))
  };
}

function average(values = [], fallback = 0) {
  const filtered = values.filter((value) => Number.isFinite(Number(value))).map((value) => Number(value));
  if (!filtered.length) return fallback;
  return filtered.reduce((sum, value) => sum + value, 0) / filtered.length;
}

function countMistakes(quizResults = []) {
  return quizResults.filter((item) => {
    if (!isObject(item)) return false;
    if (typeof item.correct === 'boolean') return item.correct === false;
    if (typeof item.isCorrect === 'boolean') return item.isCorrect === false;
    const score = toFiniteNumber(item.score ?? item.accuracy, 1);
    return score < 0.5;
  }).length;
}

function detectRepeatedMistakes(quizResults = []) {
  const byConcept = new Map();
  asArray(quizResults).forEach((result) => {
    const key = String(result?.conceptId || result?.segmentId || result?.questionId || 'generic').trim();
    const wrong = (typeof result?.correct === 'boolean' && result.correct === false)
      || (typeof result?.isCorrect === 'boolean' && result.isCorrect === false)
      || toFiniteNumber(result?.score ?? result?.accuracy, 1) < 0.5;

    if (!wrong) return;
    byConcept.set(key, (byConcept.get(key) || 0) + 1);
  });

  return [...byConcept.entries()]
    .filter(([, count]) => count >= 2)
    .map(([conceptId, count]) => ({ conceptId, count }));
}

function extractInteractionSignals(interactionHistory = []) {
  let skipped = 0;
  let repeats = 0;

  asArray(interactionHistory).forEach((entry) => {
    const action = String(entry?.action || entry?.eventType || entry?.type || '').toLowerCase();
    if (action.includes('skip')) skipped += 1;
    if (action.includes('repeat') || action.includes('replay') || action.includes('seek-back')) repeats += 1;
  });

  return {
    skipped,
    repeats
  };
}

function collectRuntimeSignals(runtime = {}, scheduler = null, current = {}) {
  const quizResults = asArray(current.quizResults).length
    ? asArray(current.quizResults)
    : asArray(runtime?.quizEngine?.getResults?.() || runtime?.metadata?.quiz?.results || runtime?.metadata?.quizResults || []);

  const interactionHistory = asArray(current.interactionHistory).length
    ? asArray(current.interactionHistory)
    : asArray(runtime?.interactionHistory || runtime?.metadata?.interactionHistory || runtime?.sceneEventRuntime?.snapshot?.()?.dispatch?.recent || []);

  const responseTimes = quizResults
    .map((result) => toFiniteNumber(result?.responseTimeMs ?? result?.durationMs, NaN))
    .filter((value) => Number.isFinite(value));

  const progress = getProgressSummary(runtime, scheduler);
  const mistakes = countMistakes(quizResults);
  const repeatedMistakes = detectRepeatedMistakes(quizResults);
  const interactionSignals = extractInteractionSignals(interactionHistory);

  return {
    progress,
    quizResults,
    interactionHistory,
    mistakes,
    repeatedMistakes,
    skippedCount: interactionSignals.skipped,
    repeatedSectionCount: interactionSignals.repeats,
    averageResponseTimeMs: average(responseTimes, 0)
  };
}

export class AdaptiveTeachingRecoveryEngine {
  constructor(runtime = {}, options = {}) {
    this.runtime = runtime;
    this.options = {
      ...DEFAULT_ADAPTIVE_ENGINE_CONFIG,
      ...(isObject(options) ? options : {})
    };

    this.scheduler = runtime?.timelineScheduler || runtime?.sceneScheduler || null;
    this.narration = runtime?.metadata?.narration || { segments: [] };
    this.segments = asArray(this.narration?.segments);
    this.persistenceAdapter = this.options.persistenceAdapter || this.scheduler?.persistenceAdapter || createDefaultPersistenceAdapter();
    this.persistenceKey = String(this.options.persistenceKey || this.options.persistenceStorageKey || DEFAULT_ADAPTIVE_ENGINE_CONFIG.persistenceKey);

    this.listeners = createChannelSet();
    this.unsubscribers = [];
    this.lastRevisionCheckpointAt = 0;

    normalizeRuntimeSignalStore(this.runtime);

    this.state = {
      modeProfile: buildModeProfile(this.options.defaultMode, this.options.learningModes || {}),
      timelineTimeMs: getRuntimeTimeMs(this.scheduler),
      progress: {
        progressPercent: 0,
        completedUnits: 0,
        totalUnits: 1
      },
      metrics: {
        struggleScore: 0,
        confidenceScore: 1,
        averageResponseTimeMs: 0,
        mistakes: 0,
        skippedCount: 0,
        repeatedSectionCount: 0,
        repeatedMistakes: []
      },
      adaptation: {
        explanationDepth: 0.55,
        pacing: 1,
        examplesIntensity: 0.7,
        complexity: 0.55,
        recommendations: []
      },
      questions: buildQuestionBundle(this.segments, 0.55),
      recovery: {
        interrupted: false,
        checkpointId: null,
        resumeTimeMs: 0,
        progressHistory: []
      },
      diagnostics: {
        evaluations: 0,
        recoveries: 0,
        adjustments: 0
      }
    };

    this.attachScheduler(this.scheduler);
    this.evaluate('boot');
  }

  on(channel, listener) {
    const safeChannel = String(channel || '').trim() || '*';
    if (typeof listener !== 'function') {
      throw new Error('AdaptiveTeachingRecoveryEngine listener must be a function.');
    }

    if (!this.listeners.has(safeChannel)) {
      this.listeners.set(safeChannel, new Set());
    }

    this.listeners.get(safeChannel).add(listener);
    return () => this.off(safeChannel, listener);
  }

  off(channel, listener) {
    const safeChannel = String(channel || '').trim() || '*';
    const listeners = this.listeners.get(safeChannel);
    if (!listeners) return false;
    return listeners.delete(listener);
  }

  emit(channel, payload = {}) {
    const safeChannel = String(channel || '').trim() || 'adaptive-learning-event';
    const message = {
      channel: safeChannel,
      payload,
      state: this.snapshot(),
      timestamp: Date.now()
    };

    safeEmit(this.listeners, safeChannel, message);
    safeEmit(this.listeners, '*', message);
    return message;
  }

  attachScheduler(scheduler) {
    if (!scheduler || typeof scheduler.on !== 'function') return;

    const unsubscribe = scheduler.on('*', (event) => {
      this.handleSchedulerEvent(event);
    });

    this.unsubscribers.push(unsubscribe);
  }

  handleSchedulerEvent(event = {}) {
    const name = String(event?.name || 'UnknownRuntimeEvent');
    if (name === 'TimelinePaused' || name === 'TimelineResumed' || name === 'TimelineStarted' || name === 'TimelineCompleted') {
      this.evaluate(`timeline:${name}`, {
        event
      });
      return;
    }

    if (name === 'CheckpointReached') {
      this.state.recovery.checkpointId = event?.payload?.checkpointId || this.state.recovery.checkpointId;
      this.state.recovery.resumeTimeMs = toFiniteNumber(event?.payload?.timeMs, this.state.recovery.resumeTimeMs);
      this.persistSession();
      this.evaluate('timeline:checkpoint', {
        event
      });
    }
  }

  setLearningMode(mode = 'intermediate') {
    this.state.modeProfile = buildModeProfile(mode, this.options.learningModes || {});
    this.evaluate('mode-change', {
      mode: this.state.modeProfile.mode,
      knownMode: this.state.modeProfile.knownMode
    });
    this.persistSession();
    return this.snapshot();
  }

  calculateStruggleScore(signals = {}) {
    const progress = clamp(toFiniteNumber(signals?.progress?.progressPercent, 0) / 100, 0, 1);
    const mistakesFactor = clamp(toFiniteNumber(signals?.mistakes, 0) / 10, 0, 1);
    const skippedFactor = clamp(toFiniteNumber(signals?.skippedCount, 0) / 6, 0, 1);
    const repeatsFactor = clamp(toFiniteNumber(signals?.repeatedSectionCount, 0) / 6, 0, 1);
    const repeatedMistakesFactor = clamp(asArray(signals?.repeatedMistakes).length / 5, 0, 1);

    const responseTargetMs = Math.max(1000, toFiniteNumber(this.options.responseTimeTargetMs, 6000));
    const responseRatio = clamp(toFiniteNumber(signals?.averageResponseTimeMs, 0) / responseTargetMs, 0, 2);
    const responseFactor = clamp((responseRatio - 1) / 1, 0, 1);

    return clamp(
      (mistakesFactor * 0.28)
      + (skippedFactor * 0.16)
      + (repeatsFactor * 0.16)
      + (repeatedMistakesFactor * 0.2)
      + (responseFactor * 0.14)
      + ((1 - progress) * 0.06),
      0,
      1
    );
  }

  buildRecommendations(metrics = {}, modeProfile = {}) {
    const recommendations = [];

    if (toFiniteNumber(metrics.mistakes, 0) >= 1) {
      recommendations.push('review-core-concepts');
    }

    if (toFiniteNumber(metrics.mistakes, 0) >= 2) {
      recommendations.push('use-easier-explanations');
      recommendations.push('add-guided-examples');
    }

    if (metrics.struggleScore >= this.options.highStruggleThreshold) {
      recommendations.push('review-core-concepts');
      recommendations.push('use-easier-explanations');
      recommendations.push('add-guided-examples');
    }

    if (metrics.repeatedSectionCount >= 2 || metrics.repeatedMistakes.length > 0) {
      recommendations.push('introduce-revision-checkpoint');
      recommendations.push('target-repeat-mistakes');
    }

    if (metrics.skippedCount >= 2) {
      recommendations.push('recover-skipped-lesson-segments');
    }

    if (metrics.struggleScore <= this.options.lowStruggleThreshold && toFiniteNumber(metrics.confidenceScore, 0) > 0.7) {
      recommendations.push('accelerate-pacing');
      recommendations.push('increase-challenge-complexity');
    }

    if (String(modeProfile.mode || '').includes('exam')) {
      recommendations.push('emphasize-exam-revision-checkpoints');
    }

    if (String(modeProfile.mode || '').includes('interview')) {
      recommendations.push('emphasize-interview-challenge-questions');
    }

    if (!recommendations.length) {
      recommendations.push('continue-current-adaptive-path');
    }

    return [...new Set(recommendations)];
  }

  buildAdaptation(modeProfile = {}, metrics = {}) {
    const struggle = clamp(toFiniteNumber(metrics.struggleScore, 0), 0, 1);
    const confidence = clamp(toFiniteNumber(metrics.confidenceScore, 0), 0, 1);
    const mistakesPenalty = clamp(toFiniteNumber(metrics.mistakes, 0) / 8, 0, 0.25);
    const skipPenalty = clamp(toFiniteNumber(metrics.skippedCount, 0) / 10, 0, 0.2);

    const explanationDepth = clamp(toFiniteNumber(modeProfile.explanationDepth, 0.55) + (struggle * 0.25), 0.2, 1);
    const pacing = clamp(toFiniteNumber(modeProfile.pacing, 1) - (struggle * 0.35) + (confidence * 0.15), 0.5, 1.4);
    const examplesIntensity = clamp(toFiniteNumber(modeProfile.examplesIntensity, 0.7) + (struggle * 0.25), 0.2, 1);
    const complexity = clamp(
      toFiniteNumber(modeProfile.complexity, 0.55)
      - (struggle * 0.25)
      + (confidence * 0.15)
      - mistakesPenalty
      - skipPenalty,
      0.2,
      1
    );

    return {
      explanationDepth,
      pacing,
      examplesIntensity,
      complexity,
      recommendations: this.buildRecommendations(metrics, modeProfile)
    };
  }

  evaluate(reason = 'manual', context = {}) {
    normalizeRuntimeSignalStore(this.runtime);

    if (Array.isArray(context?.quizResults) && context.quizResults.length > 0) {
      this.runtime.metadata.quizResults = [...context.quizResults];
    }

    if (Array.isArray(context?.interactionHistory) && context.interactionHistory.length > 0) {
      this.runtime.metadata.interactionHistory = [...context.interactionHistory];
    }

    const runtimeSignals = collectRuntimeSignals(this.runtime, this.scheduler, context);
    const struggleScore = this.calculateStruggleScore(runtimeSignals);
    const confidenceScore = clamp(1 - struggleScore, 0, 1);

    const metrics = {
      struggleScore,
      confidenceScore,
      averageResponseTimeMs: runtimeSignals.averageResponseTimeMs,
      mistakes: runtimeSignals.mistakes,
      skippedCount: runtimeSignals.skippedCount,
      repeatedSectionCount: runtimeSignals.repeatedSectionCount,
      repeatedMistakes: runtimeSignals.repeatedMistakes
    };

    const adaptation = this.buildAdaptation(this.state.modeProfile, metrics);
    const questions = buildQuestionBundle(this.segments, adaptation.complexity);

    this.state.timelineTimeMs = getRuntimeTimeMs(this.scheduler);
    this.state.progress = runtimeSignals.progress;
    this.state.metrics = metrics;
    this.state.adaptation = adaptation;
    this.state.questions = questions;
    this.state.diagnostics.evaluations += 1;
    this.state.diagnostics.adjustments += 1;

    this.state.recovery.progressHistory.push({
      at: Date.now(),
      reason,
      progressPercent: this.state.progress.progressPercent,
      struggleScore: metrics.struggleScore,
      mode: this.state.modeProfile.mode
    });

    if (this.state.recovery.progressHistory.length > 100) {
      this.state.recovery.progressHistory.shift();
    }

    this.runtime.metadata = {
      ...(this.runtime.metadata || {}),
      adaptiveLearning: this.snapshot(),
      aiTeacherAdapter: {
        ...(this.runtime.metadata?.aiTeacherAdapter || {}),
        adaptiveLearningState: this.snapshot()
      }
    };

    const timelineNow = this.state.timelineTimeMs;
    const revisionCheckpointCooldownMs = Math.max(1, toFiniteNumber(this.options.revisionCheckpointCooldownMs, 1200));
    const shouldCreateRevisionCheckpoint = adaptation.recommendations.includes('introduce-revision-checkpoint')
      && this.scheduler?.createCheckpoint
      && !String(reason || '').startsWith('timeline:checkpoint')
      && Math.abs(timelineNow - this.lastRevisionCheckpointAt) >= revisionCheckpointCooldownMs;

    if (shouldCreateRevisionCheckpoint) {
      const checkpoint = this.scheduler.createCheckpoint('revision', {
        source: 'adaptive-teaching-runtime',
        reason,
        struggleScore: metrics.struggleScore
      });
      this.state.recovery.checkpointId = checkpoint?.id || this.state.recovery.checkpointId;
      this.state.recovery.resumeTimeMs = checkpoint?.timeMs ?? this.state.recovery.resumeTimeMs;
      this.lastRevisionCheckpointAt = checkpoint?.timeMs ?? timelineNow;
    }

    this.emit('adaptive-learning-evaluated', {
      reason,
      context,
      metrics,
      adaptation
    });

    this.emit('adaptive-learning-questions-generated', {
      reason,
      questions
    });

    return this.snapshot();
  }

  recordQuizResult(result = {}) {
    const existing = asArray(this.runtime?.metadata?.quizResults);
    this.runtime.metadata = {
      ...(this.runtime.metadata || {}),
      quizResults: [...existing, result]
    };

    return this.evaluate('quiz-result', {
      quizResults: this.runtime.metadata.quizResults
    });
  }

  recordInteraction(interaction = {}) {
    const existing = asArray(this.runtime?.metadata?.interactionHistory);
    this.runtime.metadata = {
      ...(this.runtime.metadata || {}),
      interactionHistory: [...existing, interaction]
    };

    return this.evaluate('interaction', {
      interactionHistory: this.runtime.metadata.interactionHistory
    });
  }

  handleExternalTimelineMutation(mutationType = 'manual', context = {}) {
    const safeType = String(mutationType || 'manual').trim() || 'manual';

    if (safeType.includes('resume') || safeType.includes('recover')) {
      this.state.recovery.interrupted = false;
    }

    if (safeType.includes('seek') || safeType.includes('replay') || safeType.includes('checkpoint')) {
      this.state.recovery.resumeTimeMs = getRuntimeTimeMs(this.scheduler);
    }

    return this.evaluate(`mutation:${safeType}`, context);
  }

  buildRecoveryPlan(checkpointId = null) {
    const checkpoint = checkpointId
      ? this.scheduler?.checkpoints?.getById?.(checkpointId)
      : this.scheduler?.checkpoints?.latest?.('revision') || this.scheduler?.checkpoints?.latest?.('resume') || this.scheduler?.checkpoints?.latest?.();

    const plan = {
      checkpointId: checkpoint?.id || null,
      resumeTimeMs: toFiniteNumber(checkpoint?.timeMs, this.state.recovery.resumeTimeMs),
      recommendations: this.state.adaptation.recommendations,
      mode: this.state.modeProfile.mode,
      progressPercent: this.state.progress.progressPercent,
      interrupted: this.state.recovery.interrupted
    };

    this.emit('adaptive-learning-recovery-plan', {
      plan
    });

    return plan;
  }

  resumeFromCheckpoint(checkpointId = null) {
    const checkpoint = checkpointId
      ? this.scheduler?.checkpoints?.getById?.(checkpointId)
      : this.scheduler?.checkpoints?.latest?.('revision') || this.scheduler?.checkpoints?.latest?.('resume') || this.scheduler?.checkpoints?.latest?.();

    if (!checkpoint) return this.snapshot();

    this.scheduler?.seekByTime?.(checkpoint.timeMs);
    this.state.recovery.interrupted = false;
    this.state.recovery.checkpointId = checkpoint.id;
    this.state.recovery.resumeTimeMs = checkpoint.timeMs;

    const snapshot = this.evaluate('resume-checkpoint', {
      checkpointId: checkpoint.id
    });

    this.persistSession();
    return snapshot;
  }

  markInterrupted(reason = 'interrupted') {
    this.state.timelineTimeMs = getRuntimeTimeMs(this.scheduler);
    this.state.recovery.resumeTimeMs = this.state.timelineTimeMs;
    this.state.recovery.interrupted = true;
    this.state.diagnostics.recoveries += 1;

    this.emit('adaptive-learning-interrupted', {
      reason,
      timelineTimeMs: this.state.timelineTimeMs
    });

    return this.persistSession();
  }

  createPersistencePayload() {
    return {
      schemaVersion: 'v1',
      persistedAt: Date.now(),
      state: this.state
    };
  }

  persistSession(adapter = this.persistenceAdapter) {
    if (!adapter) return false;

    const serialized = JSON.stringify(this.createPersistencePayload());
    if (typeof adapter.setItem === 'function') {
      adapter.setItem(this.persistenceKey, serialized);
    } else if (typeof adapter.save === 'function') {
      adapter.save(this.persistenceKey, serialized);
    } else {
      return false;
    }

    this.emit('adaptive-learning-persisted', {
      persistenceKey: this.persistenceKey
    });
    return true;
  }

  recoverSession(adapter = this.persistenceAdapter) {
    if (!adapter) return false;

    let raw = null;
    if (typeof adapter.getItem === 'function') {
      raw = adapter.getItem(this.persistenceKey);
    } else if (typeof adapter.load === 'function') {
      raw = adapter.load(this.persistenceKey);
    }

    if (!raw) return false;

    const parsed = parsePayload(raw);
    if (!parsed || !isObject(parsed.state)) return false;

    this.state = {
      ...this.state,
      ...parsed.state,
      recovery: {
        ...(isObject(parsed?.state?.recovery) ? parsed.state.recovery : this.state.recovery),
        interrupted: true
      },
      diagnostics: {
        ...(isObject(parsed?.state?.diagnostics) ? parsed.state.diagnostics : this.state.diagnostics),
        recoveries: toFiniteNumber(parsed?.state?.diagnostics?.recoveries, this.state.diagnostics.recoveries) + 1
      }
    };

    this.state.timelineTimeMs = Math.max(0, toFiniteNumber(this.state.timelineTimeMs, getRuntimeTimeMs(this.scheduler)));
    this.scheduler?.seekByTime?.(this.state.timelineTimeMs);

    this.emit('adaptive-learning-recovered', {
      persistenceKey: this.persistenceKey,
      interrupted: true
    });

    this.evaluate('recover-session', {
      recovered: true
    });

    return true;
  }

  synchronize(reason = 'manual', context = {}) {
    return this.evaluate(reason, context);
  }

  snapshot() {
    return deepClone({
      schemaVersion: 'v1',
      timelineTimeMs: this.state.timelineTimeMs,
      modeProfile: this.state.modeProfile,
      progress: this.state.progress,
      metrics: this.state.metrics,
      adaptation: this.state.adaptation,
      questions: this.state.questions,
      recovery: this.state.recovery,
      diagnostics: this.state.diagnostics,
      supportedLearningModes: [...LEARNING_MODES]
    });
  }

  destroy() {
    this.persistSession();

    this.unsubscribers.forEach((unsubscribe) => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    });
    this.unsubscribers = [];

    this.emit('adaptive-learning-destroyed', {
      sceneId: this.runtime?.sceneId || null
    });
  }

  static supportedChannels() {
    return [
      'adaptive-learning-evaluated',
      'adaptive-learning-questions-generated',
      'adaptive-learning-recovery-plan',
      'adaptive-learning-interrupted',
      'adaptive-learning-persisted',
      'adaptive-learning-recovered',
      'adaptive-learning-destroyed'
    ];
  }
}

export function createAdaptiveTeachingRecoveryEngine(runtime = {}, options = {}) {
  return new AdaptiveTeachingRecoveryEngine(runtime, options);
}
