import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Circle, Loader, Pause, Play, RotateCcw, ZoomIn, Hand } from 'lucide-react';
import SceneLoader from '../3d/SceneLoader';
import SceneTimeline from '../3d/SceneTimeline';
import { buildTeacherSynchronizationPlan } from '../../utils/teacherSynchronizationEngine.js';
import ThreeErrorBoundary from '../three/ThreeErrorBoundary';
import { getNextVisualizationMode, resolveVisualizationMode } from '../../utils/threeRuntimeSafety.js';

const SceneViewer = lazy(() => import('../3d/SceneViewer'));

function RuntimeCheck({ label, ok, pending }) {
  if (ok) {
    return (
      <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200">
        <CheckCircle2 className="h-3.5 w-3.5" /> {label}
      </div>
    );
  }

  if (pending) {
    return (
      <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1 text-xs text-amber-200">
        <Loader className="h-3.5 w-3.5 animate-spin" /> {label}
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-950/70 px-3 py-1 text-xs text-slate-300">
      <Circle className="h-3.5 w-3.5" /> {label}
    </div>
  );
}

export default function Interactive3DLessonRuntime({
  topic = '',
  sourceContent = '',
  sourceType = 'typed-topic',
  userId,
  aiTeacherPlan = '',
  onOpenStudio
}) {
  const [sceneStatus, setSceneStatus] = useState('idle');
  const [sceneData, setSceneData] = useState(null);
  const [scenePlan, setScenePlan] = useState(null);
  const [selectedPart, setSelectedPart] = useState('');
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [autoRotate, setAutoRotate] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [visualizationMode, setVisualizationMode] = useState('interactive-3d');

  const sceneSteps = Array.isArray(scenePlan?.timeline) ? scenePlan.timeline : [];
  const activeStep = sceneSteps[activeStepIndex] || null;

  const syncPlan = useMemo(() => {
    const sceneModel = {
      hotspots: sceneData?.hotspots || [],
      models: (sceneData?.objects || []).map((item, index) => ({
        id: item.id || `model-${index + 1}`,
        label: item.label
      })),
      animations: sceneSteps
    };

    return buildTeacherSynchronizationPlan({
      explanation: activeStep?.objective || aiTeacherPlan || `Explain ${topic}`,
      topic,
      scene: sceneModel
    });
  }, [activeStep?.objective, aiTeacherPlan, topic, sceneData?.hotspots, sceneData?.objects, sceneSteps]);

  useEffect(() => {
    setActiveStepIndex(0);
    setSelectedPart('');
    setVisualizationMode('interactive-3d');
  }, [topic, sourceContent, sourceType]);

  const handle3DFallback = (requestedMode = '') => {
    const nextMode = resolveVisualizationMode({
      supports3D: false,
      fallbackType: requestedMode === 'interactive-2d' ? 'diagram' : '',
      hasWhiteboard: true,
      hasConceptMap: true
    });
    setVisualizationMode(nextMode);
  };

  useEffect(() => {
    if (!sceneSteps.length || !isPlaying) return undefined;

    const step = sceneSteps[activeStepIndex] || sceneSteps[0];
    const duration = Math.max(1200, step?.durationMs || 1600);
    const timer = setTimeout(() => {
      setActiveStepIndex((value) => (value + 1) % sceneSteps.length);
    }, duration);

    return () => clearTimeout(timer);
  }, [sceneSteps, activeStepIndex, isPlaying]);

  useEffect(() => {
    if (!activeStep?.target) return;
    setSelectedPart(activeStep.target);
  }, [activeStep?.target]);

  const checklist = {
    modelLoaded: Boolean(sceneData?.objects?.length),
    syncedTeacher: Boolean(syncPlan?.steps?.length),
    timelineReady: sceneSteps.length > 0,
    cameraControls: true,
    labelsReady: Boolean(sceneData?.labels?.length),
    animationReady: sceneSteps.length > 0,
    interactionReady: Boolean(sceneData?.hotspots?.length || sceneData?.objects?.length),
    practiceReady: Boolean(scenePlan?.practiceMode?.tasks?.length)
  };

  const sourceText = `${topic}\n${sourceContent}`.trim();

  return (
    <div className="space-y-4 rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/40">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-cyan-300">Interactive 3D Viewer</p>
          <h3 className="mt-2 text-xl font-semibold text-white">{topic || '3D Lesson Runtime'}</h3>
          <p className="mt-1 text-sm text-slate-400">Status: {sceneStatus}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setIsPlaying((value) => !value)} className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-xs text-slate-200">
            {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />} {isPlaying ? 'Pause' : 'Play'}
          </button>
          <button onClick={() => setAutoRotate((value) => !value)} className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-xs text-slate-200">
            <RotateCcw className="h-3.5 w-3.5" /> {autoRotate ? 'Stop Rotate' : 'Auto Rotate'}
          </button>
          <button onClick={() => setShowLabels((value) => !value)} className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-xs text-slate-200">
            <ZoomIn className="h-3.5 w-3.5" /> {showLabels ? 'Hide Labels' : 'Show Labels'}
          </button>
          <button onClick={onOpenStudio} className="inline-flex items-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-100">
            <Hand className="h-3.5 w-3.5" /> Open Full 3D Studio
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <RuntimeCheck label="Loading lesson model" ok={checklist.modelLoaded} pending={sceneStatus === 'generating'} />
        <RuntimeCheck label="AI Teacher synchronized" ok={checklist.syncedTeacher} pending={!checklist.syncedTeacher} />
        <RuntimeCheck label="Timeline" ok={checklist.timelineReady} pending={!checklist.timelineReady} />
        <RuntimeCheck label="Camera controls" ok={checklist.cameraControls} pending={false} />
        <RuntimeCheck label="Labels" ok={checklist.labelsReady} pending={!checklist.labelsReady} />
        <RuntimeCheck label="Animation" ok={checklist.animationReady} pending={!checklist.animationReady} />
        <RuntimeCheck label="Interaction" ok={checklist.interactionReady} pending={!checklist.interactionReady} />
        <RuntimeCheck label="Practice checkpoints" ok={checklist.practiceReady} pending={!checklist.practiceReady} />
      </div>

      <SceneLoader
        content={sourceText}
        sourceType={sourceType}
        sourcePayload={sourceContent}
        userId={userId}
        onStatusChange={setSceneStatus}
        onPlanReady={(plan) => {
          setScenePlan(plan);
          setActiveStepIndex(0);
        }}
        onSceneReady={(scene) => {
          setSceneData(scene);
          setSelectedPart(scene?.labels?.[0] || '');
        }}
      />

      <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4 text-sm text-slate-300">
        <p className="text-cyan-200">Narration sync</p>
        <p className="mt-2">{syncPlan?.steps?.[3]?.explanation || `AI teacher will explain ${topic} step-by-step.`}</p>
        {activeStep?.title ? <p className="mt-2 text-xs text-slate-400">Current step: {activeStep.title}</p> : null}
      </div>

      <div className="h-[360px] overflow-hidden rounded-2xl border border-white/10 bg-slate-950/70">
        {visualizationMode === 'interactive-3d' ? (
          <Suspense fallback={<div className="grid h-full place-items-center text-sm text-slate-400">Loading 3D viewer...</div>}>
            <ThreeErrorBoundary onFallbackMode={handle3DFallback}>
              <SceneViewer
                scene={sceneData}
                selectedPart={selectedPart}
                onSelectPart={setSelectedPart}
                autoRotate={autoRotate && isPlaying}
                exploded={false}
                crossSection={false}
                xRay={false}
                showLabels={showLabels}
                hideInactive={false}
                measurementMode={false}
                motionSpeed={1}
                cameraMode="orbit"
                highlightMode="glow"
                environmentPreset="classroom"
                sceneEffects={['particles']}
                activeTimelineStep={activeStep}
                showDynamicLabels={showLabels}
                lodLevel="medium"
                performanceProfile="balanced"
              />
            </ThreeErrorBoundary>
          </Suspense>
        ) : (
          <div className="grid h-full place-items-center p-4">
            <div className="w-full rounded-xl border border-cyan-500/20 bg-cyan-500/10 p-4 text-sm text-cyan-100">
              <p className="font-semibold">Fallback mode active: {visualizationMode}</p>
              <p className="mt-2 text-xs text-cyan-50">The lesson continues even if 3D is unavailable.</p>
              <div className="mt-3 flex gap-2">
                <button onClick={() => setVisualizationMode('interactive-3d')} className="rounded-lg border border-cyan-400/40 bg-cyan-500/20 px-3 py-2 text-xs text-white">Retry 3D</button>
                <button onClick={() => setVisualizationMode((mode) => getNextVisualizationMode(mode))} className="rounded-lg border border-slate-600 bg-slate-900/80 px-3 py-2 text-xs text-slate-200">Next fallback mode</button>
              </div>
            </div>
          </div>
        )}
      </div>

      <SceneTimeline
        steps={sceneSteps}
        activeIndex={activeStepIndex}
        isPlaying={isPlaying}
        onPlayPause={() => setIsPlaying((value) => !value)}
        onRestart={() => {
          setActiveStepIndex(0);
          setIsPlaying(true);
        }}
        onPrevious={() => setActiveStepIndex((value) => Math.max(0, value - 1))}
        onNext={() => setActiveStepIndex((value) => Math.min(sceneSteps.length - 1, value + 1))}
        onJump={(index) => setActiveStepIndex(index)}
      />

      <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
        <p className="text-sm font-semibold text-white">Interactive parts</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {(sceneData?.labels || []).slice(0, 10).map((label) => (
            <button
              key={label}
              onClick={() => setSelectedPart(label)}
              className={`rounded-lg border px-2 py-1 text-xs ${selectedPart === label ? 'border-cyan-400/50 bg-cyan-500/10 text-cyan-100' : 'border-slate-700 bg-slate-900 text-slate-300'}`}
            >
              {label}
            </button>
          ))}
          {(!sceneData?.labels || sceneData.labels.length === 0) ? <p className="text-xs text-slate-400">Scene labels will appear after model analysis.</p> : null}
        </div>
      </div>
    </div>
  );
}
