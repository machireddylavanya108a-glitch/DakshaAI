import { useEffect, useMemo, useState } from 'react';
import { Bookmark, Camera, Image, MonitorPlay, PlayCircle, SkipForward } from 'lucide-react';
import CameraTimeline, { buildCameraTimelineSteps } from './CameraTimeline';
import AnimationTimeline, { buildAnimationTrack } from './AnimationTimeline';
import NarrationSynchronizer, { buildNarrationSegments, detectPauseIntent } from './NarrationSynchronizer';
import ObjectHighlighter, { getHighlightPreset, mapHighlightByNarration } from './ObjectHighlighter';
import AutoFocus, { buildAutoFocusState } from './AutoFocus';
import SceneEffects, { getSuggestedEffects } from './SceneEffects';
import EnvironmentController, { detectEnvironmentPreset } from './EnvironmentController';

function captureSceneScreenshot() {
  try {
    return window?.location?.href || 'scene-snapshot';
  } catch (error) {
    console.error('Screenshot capture failed:', error);
    return 'scene-snapshot';
  }
}

export default function SceneDirector({
  scene,
  scenePlan,
  content,
  selectedPart,
  activeIndex,
  isTimelinePlaying,
  pausedByLearner,
  onPauseLesson,
  onResumeLesson,
  onJumpStep,
  onCameraModeChange,
  onHighlightModeChange,
  onEnvironmentChange,
  onEffectsChange,
  onBookmark,
  onHistory,
  onAskQuestion
}) {
  const [questionInput, setQuestionInput] = useState('');
  const [cameraMode, setCameraMode] = useState('orbit');
  const [highlightMode, setHighlightMode] = useState('glow');
  const [environment, setEnvironment] = useState(detectEnvironmentPreset(scenePlan?.subject, content));
  const [activeEffects, setActiveEffects] = useState(getSuggestedEffects(content, selectedPart));

  useEffect(() => {
    setEnvironment(detectEnvironmentPreset(scenePlan?.subject, content));
  }, [scenePlan?.subject, content]);

  useEffect(() => {
    setActiveEffects(getSuggestedEffects(content, selectedPart));
  }, [content, selectedPart]);

  const cameraTimeline = useMemo(() => buildCameraTimelineSteps(scenePlan, cameraMode), [scenePlan, cameraMode]);
  const animationTimeline = useMemo(() => buildAnimationTrack(scenePlan), [scenePlan]);
  const narrationSegments = useMemo(() => buildNarrationSegments(scenePlan, content), [scenePlan, content]);
  const focusState = useMemo(() => buildAutoFocusState({ scene, selectedPart, cameraMode }), [scene, selectedPart, cameraMode]);
  const highlightPreset = useMemo(() => getHighlightPreset(highlightMode), [highlightMode]);

  useEffect(() => {
    const currentNarration = narrationSegments[activeIndex]?.line || '';
    const modeFromNarration = mapHighlightByNarration(currentNarration);
    if (modeFromNarration !== 'none') setHighlightMode(modeFromNarration);
  }, [activeIndex, narrationSegments]);

  useEffect(() => {
    onCameraModeChange?.(cameraMode, focusState);
  }, [cameraMode, focusState, onCameraModeChange]);

  useEffect(() => {
    onHighlightModeChange?.(highlightMode, highlightPreset);
  }, [highlightMode, highlightPreset, onHighlightModeChange]);

  useEffect(() => {
    onEnvironmentChange?.(environment);
  }, [environment, onEnvironmentChange]);

  useEffect(() => {
    onEffectsChange?.(activeEffects);
  }, [activeEffects, onEffectsChange]);

  const handleQuestionSubmit = () => {
    const question = questionInput.trim();
    if (!question) return;
    if (detectPauseIntent(question)) {
      onPauseLesson?.();
    }
    onAskQuestion?.(question);
    setQuestionInput('');
  };

  const toggleEffect = (effect) => {
    setActiveEffects((value) => value.includes(effect) ? value.filter((item) => item !== effect) : [...value, effect]);
  };

  const handleBookmark = () => {
    const bookmark = {
      sceneId: scene?.id || 'scene',
      stepIndex: activeIndex,
      target: selectedPart || focusState.targetLabel || '',
      cameraMode,
      environment,
      screenshotRef: captureSceneScreenshot(),
      createdAt: new Date().toISOString()
    };
    onBookmark?.(bookmark);
  };

  const handleReplay = () => {
    onJumpStep?.(0);
    onResumeLesson?.();
  };

  const handleSaveFavoriteMoment = () => {
    onHistory?.({
      type: 'favorite-moment',
      stepIndex: activeIndex,
      target: selectedPart || focusState.targetLabel || '',
      createdAt: new Date().toISOString()
    });
  };

  const handleGenerateNotes = () => {
    const segment = narrationSegments[activeIndex];
    onHistory?.({
      type: 'scene-note',
      stepIndex: activeIndex,
      note: `${segment?.line || 'Scene detail'} | Camera: ${cameraMode} | Environment: ${environment}`,
      createdAt: new Date().toISOString()
    });
  };

  return (
    <div className="space-y-3 rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={handleReplay} className="rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-xs text-slate-100"><PlayCircle className="mr-1 inline h-3.5 w-3.5" />Replay</button>
        <button type="button" onClick={() => onJumpStep?.(Math.max(0, Math.min(cameraTimeline.length - 1, activeIndex + 1)))} className="rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-xs text-slate-100"><SkipForward className="mr-1 inline h-3.5 w-3.5" />Skip</button>
        <button type="button" onClick={handleBookmark} className="rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-xs text-slate-100"><Bookmark className="mr-1 inline h-3.5 w-3.5" />Bookmark</button>
        <button type="button" onClick={handleSaveFavoriteMoment} className="rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-xs text-slate-100"><MonitorPlay className="mr-1 inline h-3.5 w-3.5" />Favorite</button>
        <button type="button" onClick={handleGenerateNotes} className="rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-xs text-slate-100"><Image className="mr-1 inline h-3.5 w-3.5" />Export Notes</button>
        <span className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-[11px] text-cyan-100">{isTimelinePlaying ? 'Timeline running' : 'Timeline paused'} • {pausedByLearner ? 'Interactive pause active' : 'Live sync active'}</span>
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        <CameraTimeline
          steps={cameraTimeline}
          activeIndex={activeIndex}
          onPrevious={() => onJumpStep?.(Math.max(0, activeIndex - 1))}
          onNext={() => onJumpStep?.(Math.min(cameraTimeline.length - 1, activeIndex + 1))}
          onJump={onJumpStep}
        />
        <AnimationTimeline
          steps={animationTimeline}
          activeIndex={activeIndex}
          isPlaying={isTimelinePlaying && !pausedByLearner}
          onPlayPause={() => (pausedByLearner ? onResumeLesson?.() : onPauseLesson?.())}
        />
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        <NarrationSynchronizer segments={narrationSegments} activeIndex={activeIndex} paused={pausedByLearner} />
        <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-4">
          <p className="text-xs uppercase tracking-[0.28em] text-cyan-300">Interactive Pause</p>
          <p className="mt-2 text-xs text-slate-400">Ask: "What is this?" to pause, answer, and resume exactly from the same camera and step.</p>
          <div className="mt-3 flex gap-2">
            <input
              value={questionInput}
              onChange={(event) => setQuestionInput(event.target.value)}
              placeholder="Ask learner question..."
              className="w-full rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-xs text-slate-100 outline-none"
            />
            <button type="button" onClick={handleQuestionSubmit} className="rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-xs text-slate-100">Ask</button>
            <button type="button" onClick={pausedByLearner ? onResumeLesson : onPauseLesson} className="rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-xs text-slate-100">{pausedByLearner ? 'Resume' : 'Pause'}</button>
          </div>
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-3">
        <AutoFocus scene={scene} selectedPart={selectedPart} cameraMode={cameraMode} onCameraModeChange={setCameraMode} />
        <ObjectHighlighter mode={highlightMode} selectedPart={selectedPart} onModeChange={setHighlightMode} />
        <SceneEffects activeEffects={activeEffects} onToggleEffect={toggleEffect} />
      </div>

      <EnvironmentController environment={environment} onEnvironmentChange={setEnvironment} />
      <div className="rounded-xl border border-white/10 bg-slate-950/60 p-3 text-xs text-slate-300">
        <Camera className="mr-1 inline h-3.5 w-3.5 text-cyan-300" />Camera target: {focusState.targetLabel || 'auto'} • Suggested position: {focusState.cameraPosition.join(', ')}
      </div>
    </div>
  );
}
