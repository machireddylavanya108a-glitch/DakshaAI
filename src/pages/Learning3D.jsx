import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Search, Sparkles, BookOpen, Layers3, BrainCircuit, Target, Focus, PlayCircle } from 'lucide-react';
import AnnotationLabel from '../components/3d/AnnotationLabel';
import SceneTimeline from '../components/3d/SceneTimeline';

const SceneLoader = lazy(() => import('../components/3d/SceneLoader'));
const SceneViewer = lazy(() => import('../components/3d/SceneViewer'));
const SceneController = lazy(() => import('../components/3d/SceneController'));

const sourceOptions = [
  'typed-topic',
  'pdf',
  'docx',
  'ppt',
  'book',
  'notes',
  'camera-ocr',
  'image',
  'handwritten-notes',
  'youtube',
  'website',
  'ai-teacher-lesson'
];

function readTeacherContextFromStorage() {
  try {
    const keys = Object.keys(localStorage || {});
    const sessionKey = keys.find((item) => item.startsWith('daksha:ai-teacher:session:'));
    if (!sessionKey) return '';
    const payload = JSON.parse(localStorage.getItem(sessionKey) || '{}');
    return `${payload?.topic || ''} ${payload?.chapterIndex !== undefined ? `chapter ${payload.chapterIndex + 1}` : ''}`.trim();
  } catch (error) {
    console.error('Unable to load AI teacher lesson context:', error);
    return '';
  }
}

export default function Learning3D() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [topic, setTopic] = useState('Heart Surgery');
  const [sourceType, setSourceType] = useState('typed-topic');
  const [sourceContent, setSourceContent] = useState('Explain heart surgery procedure with organs, doctor, and medical tools.');
  const [selectedPart, setSelectedPart] = useState('');
  const [hideInactive, setHideInactive] = useState(false);
  const [measurementMode, setMeasurementMode] = useState(false);
  const [practiceMode, setPracticeMode] = useState(false);
  const [assessmentMode, setAssessmentMode] = useState(false);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [autoRotate, setAutoRotate] = useState(true);
  const [explodeView, setExplodeView] = useState(false);
  const [crossSection, setCrossSection] = useState(false);
  const [xRay, setXRay] = useState(false);
  const [showLabels, setShowLabels] = useState(true);
  const [animationPaused, setAnimationPaused] = useState(false);
  const [motionSpeed, setMotionSpeed] = useState(1);
  const [isTimelinePlaying, setIsTimelinePlaying] = useState(true);
  const [loading, setLoading] = useState(true);
  const [sceneData, setSceneData] = useState(null);
  const [scenePlan, setScenePlan] = useState(null);
  const [sceneStatus, setSceneStatus] = useState('idle');
  const [sceneId, setSceneId] = useState('');
  const [hotspotInfo, setHotspotInfo] = useState(null);
  const [assessmentPromptIndex, setAssessmentPromptIndex] = useState(0);
  const [assessmentFeedback, setAssessmentFeedback] = useState('');
  const [sourcePayload, setSourcePayload] = useState('');
  const [syncMode, setSyncMode] = useState(true);

  const effectiveContent = useMemo(() => {
    const direct = `${topic}\n${sourceContent}`.trim();
    if (sourceType === 'ai-teacher-lesson') {
      return `${topic}\n${sourcePayload || readTeacherContextFromStorage()}`.trim();
    }
    return direct;
  }, [topic, sourceContent, sourceType, sourcePayload]);

  const sceneSteps = scenePlan?.timeline || [];
  const currentStep = sceneSteps[activeStepIndex] || null;
  const assessmentTasks = scenePlan?.assessment?.tasks || [];
  const practiceTasks = scenePlan?.practiceMode?.tasks || [];

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!sceneSteps.length || !isTimelinePlaying || animationPaused) return undefined;

    const step = sceneSteps[activeStepIndex] || sceneSteps[0];
    const duration = Math.max(1000, Math.round((step?.durationMs || 1600) / Math.max(0.5, motionSpeed)));
    const timer = setTimeout(() => {
      setActiveStepIndex((value) => (value + 1) % sceneSteps.length);
    }, duration);

    return () => clearTimeout(timer);
  }, [sceneSteps, activeStepIndex, isTimelinePlaying, animationPaused, motionSpeed]);

  useEffect(() => {
    if (!syncMode || !currentStep?.target) return;
    setSelectedPart(currentStep.target);
  }, [currentStep, syncMode]);

  const onObjectSelected = (object) => {
    if (!object) return;
    setSelectedPart(object.label);
    setHotspotInfo(object);

    if (assessmentMode && assessmentTasks.length > 0) {
      const expectedTask = assessmentTasks[assessmentPromptIndex] || '';
      const isCorrect = expectedTask.toLowerCase().includes(object.label.toLowerCase());
      setAssessmentFeedback(isCorrect ? `Correct: ${object.label}` : `Try again. Hint: ${expectedTask}`);
      if (isCorrect) {
        setAssessmentPromptIndex((value) => Math.min(value + 1, assessmentTasks.length - 1));
      }
    }
  };

  const handleFullscreen = () => {
    const root = document.documentElement;
    if (!document.fullscreenElement) {
      root.requestFullscreen?.();
      return;
    }
    document.exitFullscreen?.();
  };

  const resetSceneView = () => {
    setSelectedPart('');
    setExplodeView(false);
    setCrossSection(false);
    setXRay(false);
    setShowLabels(true);
    setAnimationPaused(false);
    setHideInactive(false);
    setMeasurementMode(false);
    setMotionSpeed(1);
  };

  const loadAITeacherLesson = () => {
    const context = readTeacherContextFromStorage();
    if (context) {
      setSourcePayload(context);
      setSourceContent(context);
      setSourceType('ai-teacher-lesson');
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.16),_transparent_35%),linear-gradient(135deg,_#020617_0%,_#0f172a_45%,_#111827_100%)] px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <div className="rounded-[2rem] border border-white/10 bg-slate-900/75 p-6 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-emerald-300">Professional 3D Learning Engine</p>
              <h1 className="mt-2 text-3xl font-semibold text-white sm:text-4xl">Automatic 3D Visual Learning for any lesson source</h1>
              <p className="mt-3 max-w-3xl text-sm text-slate-400 sm:text-base">Daksha AI analyzes the lesson, selects reusable 3D assets, composes scene plans, synchronizes with teaching flow, and delivers interactive hotspots, simulations, practice, and assessment automatically.</p>
            </div>
            <button onClick={() => navigate('/dashboard')} className="rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-2 text-sm text-slate-200">Back to Dashboard</button>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <div className="rounded-[2rem] border border-white/10 bg-slate-900/75 p-4 shadow-2xl shadow-slate-950/40 backdrop-blur-xl resize-y overflow-auto">
              <div className="mb-4 flex flex-col gap-3">
                <div className="flex items-center gap-2 text-emerald-300"><Search className="h-4 w-4" /> Source-aware lesson analysis</div>
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="text-sm text-slate-300">
                    Input Source
                    <select value={sourceType} onChange={(event) => setSourceType(event.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-slate-200">
                      {sourceOptions.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm text-slate-300">
                    Topic
                    <input value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="Heart Surgery, Car Engine, Solar System..." className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-slate-200 outline-none" />
                  </label>
                </div>
                <textarea
                  value={sourceContent}
                  onChange={(event) => setSourceContent(event.target.value)}
                  placeholder="Paste lesson content from PDF, DOCX, PPT, notes, OCR, image, website, YouTube transcript, or AI teacher lesson."
                  className="min-h-28 w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-slate-200 outline-none"
                />
                <div className="flex flex-wrap gap-2">
                  <button onClick={loadAITeacherLesson} className="rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-200">Sync AI Teacher Lesson</button>
                  <button onClick={() => setSyncMode((value) => !value)} className="rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-200">{syncMode ? 'Disable' : 'Enable'} Teacher Sync</button>
                  <span className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-100">Scene status: {sceneStatus}</span>
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-slate-900/75 p-4 shadow-2xl shadow-slate-950/40 backdrop-blur-xl resize-y overflow-auto">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Interactive 3D Model</p>
                  <h2 className="text-xl font-semibold text-white">{sceneData?.title || 'Automatic Scene Generator'}</h2>
                </div>
                <Suspense fallback={<div className="rounded-full border border-white/10 bg-slate-950/70 px-3 py-2 text-xs text-slate-400">Loading controls...</div>}>
                  <SceneController
                    onToggleExploded={() => setExplodeView((value) => !value)}
                    onToggleCrossSection={() => setCrossSection((value) => !value)}
                    onToggleXRay={() => setXRay((value) => !value)}
                    onToggleHideInactive={() => setHideInactive((value) => !value)}
                    onToggleLabels={() => setShowLabels((value) => !value)}
                    onToggleMeasurement={() => setMeasurementMode((value) => !value)}
                    onToggleAnimation={() => { setAnimationPaused((value) => !value); setAutoRotate((value) => !value); }}
                    onTogglePracticeMode={() => setPracticeMode((value) => !value)}
                    onToggleAssessmentMode={() => setAssessmentMode((value) => !value)}
                    onResetView={resetSceneView}
                    onFullscreen={handleFullscreen}
                    onSlowMotion={() => setMotionSpeed(0.6)}
                    onNormalMotion={() => setMotionSpeed(1)}
                    onFastMotion={() => setMotionSpeed(1.6)}
                    controls={[]}
                  />
                </Suspense>
              </div>
              {loading ? <div className="rounded-[2rem] border border-white/10 bg-slate-950/70 p-8 text-center text-slate-400">Preparing your immersive lesson...</div> : (
                <div className="space-y-4 rounded-[2rem] border border-white/10 bg-slate-950/70 p-5">
                  <Suspense fallback={<div className="text-sm text-slate-400">Loading scene model...</div>}>
                    <SceneLoader
                      content={effectiveContent}
                      sourceType={sourceType}
                      sourcePayload={sourcePayload}
                      userId={user?.uid}
                      onStatusChange={setSceneStatus}
                      onPlanReady={(plan) => {
                        setScenePlan(plan);
                        setActiveStepIndex(0);
                        setAssessmentPromptIndex(0);
                        setAssessmentFeedback('');
                      }}
                      onSceneReady={(scene, generatedSceneId) => {
                        setSceneData(scene);
                        setSceneId(generatedSceneId || '');
                        setSelectedPart(scene?.labels?.[0] || '');
                      }}
                    />
                  </Suspense>
                  <div className="rounded-[1.2rem] border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-100">{sceneData?.summary || 'Generating scene plan from lesson content...'}</div>
                  <div className="h-[420px] overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/70 shadow-2xl shadow-slate-950/40">
                    <Suspense fallback={<div className="grid h-full place-items-center text-sm text-slate-400">Loading 3D viewer...</div>}>
                      <SceneViewer
                        scene={sceneData}
                        selectedPart={selectedPart}
                        onSelectPart={setSelectedPart}
                        onHotspot={onObjectSelected}
                        autoRotate={!animationPaused && autoRotate}
                        exploded={explodeView}
                        crossSection={crossSection}
                        xRay={xRay}
                        showLabels={showLabels}
                        hideInactive={hideInactive}
                        measurementMode={measurementMode}
                        motionSpeed={motionSpeed}
                      />
                    </Suspense>
                  </div>

                  <SceneTimeline
                    steps={sceneSteps}
                    activeIndex={activeStepIndex}
                    isPlaying={isTimelinePlaying}
                    onPlayPause={() => setIsTimelinePlaying((value) => !value)}
                    onRestart={() => {
                      setActiveStepIndex(0);
                      setIsTimelinePlaying(true);
                    }}
                    onPrevious={() => setActiveStepIndex((value) => Math.max(0, value - 1))}
                    onNext={() => setActiveStepIndex((value) => Math.min(sceneSteps.length - 1, value + 1))}
                    onJump={(index) => setActiveStepIndex(index)}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[2rem] border border-white/10 bg-slate-900/75 p-5 shadow-2xl shadow-slate-950/40 backdrop-blur-xl resize-y overflow-auto">
              <div className="flex items-center gap-2 text-emerald-300"><Sparkles className="h-4 w-4" /> AI Explanation Panel</div>
              <h3 className="mt-3 text-xl font-semibold text-white">{topic}</h3>
              <p className="mt-2 text-sm text-slate-400">{scenePlan?.summary || 'Scene analysis is preparing subject and object detection...'}</p>
              <div className="mt-4 grid gap-3">
                <div className="rounded-[1.2rem] border border-white/10 bg-slate-950/70 p-4">
                  <p className="text-sm font-semibold text-white">Detected objects and hotspots</p>
                  <div className="mt-2 flex flex-wrap gap-2">{(sceneData?.labels || []).map((part) => <AnnotationLabel key={part} label={part} active={selectedPart === part} onClick={() => setSelectedPart(part)} />)}</div>
                </div>
                <div className="rounded-[1.2rem] border border-white/10 bg-slate-950/70 p-4">
                  <p className="text-sm font-semibold text-white">Subject and simulation mode</p>
                  <p className="mt-2 text-sm text-slate-400">Subject: {scenePlan?.subject || 'Detecting...'}</p>
                  <p className="mt-2 text-sm text-slate-400">Simulation Engine: {sceneData?.simulationMode || 'Preparing...'}</p>
                  <p className="mt-2 text-sm text-slate-400">Scene ID: {sceneId || 'pending'}</p>
                </div>
                <div className="rounded-[1.2rem] border border-white/10 bg-slate-950/70 p-4">
                  <p className="text-sm font-semibold text-white">Hotspot detail</p>
                  {hotspotInfo ? (
                    <div className="mt-2 text-sm text-slate-300">
                      <p className="font-semibold text-cyan-200">{hotspotInfo.label}</p>
                      <p className="mt-1 text-slate-400">Category: {hotspotInfo.category}</p>
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-300">
                        {(hotspotInfo.facts || []).map((item) => <li key={item}>{item}</li>)}
                      </ul>
                    </div>
                  ) : <p className="mt-2 text-sm text-slate-400">Click any object to see AI explanation, function, working, and facts.</p>}
                </div>
                <div className="rounded-[1.2rem] border border-white/10 bg-slate-950/70 p-4">
                  <p className="text-sm font-semibold text-white">AI Camera + Animation cues</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-400">
                    {(scenePlan?.cameraCues || []).slice(0, 5).map((item) => <li key={item.stepId}>{item.action} on {item.target}</li>)}
                  </ul>
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-slate-900/75 p-5 shadow-2xl shadow-slate-950/40 backdrop-blur-xl resize-y overflow-auto">
              <div className="flex items-center gap-2 text-sky-300"><BrainCircuit className="h-4 w-4" /> Practice + Assessment</div>
              <div className="mt-4 space-y-3">
                <div className="rounded-[1.2rem] border border-white/10 bg-slate-950/70 p-4">
                  <p className="text-sm font-semibold text-white">Practice Mode {practiceMode ? '(Active)' : '(Inactive)'}</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-400">{practiceTasks.map((item) => <li key={item}>{item}</li>)}</ul>
                </div>
                <div className="rounded-[1.2rem] border border-white/10 bg-slate-950/70 p-4">
                  <p className="text-sm font-semibold text-white">Assessment Mode {assessmentMode ? '(Active)' : '(Inactive)'}</p>
                  <p className="mt-2 text-sm text-slate-300">Current prompt: {assessmentTasks[assessmentPromptIndex] || 'No prompt yet.'}</p>
                  <p className="mt-2 text-xs text-cyan-200">{assessmentFeedback || 'Click objects to answer the prompt.'}</p>
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-slate-900/75 p-5 shadow-2xl shadow-slate-950/40 backdrop-blur-xl resize-y overflow-auto">
              <div className="flex items-center gap-2 text-violet-300"><Layers3 className="h-4 w-4" /> Engine Capabilities</div>
              <div className="mt-4 grid gap-3 text-sm text-slate-300">
                <div className="rounded-[1.2rem] border border-white/10 bg-slate-950/70 p-4"><Target className="mb-2 h-4 w-4 text-cyan-300" /> Automatic model selection and reusable asset composition</div>
                <div className="rounded-[1.2rem] border border-white/10 bg-slate-950/70 p-4"><Focus className="mb-2 h-4 w-4 text-cyan-300" /> AI camera focus, orbit, cinematic cues, slow motion, replay support</div>
                <div className="rounded-[1.2rem] border border-white/10 bg-slate-950/70 p-4"><PlayCircle className="mb-2 h-4 w-4 text-cyan-300" /> Timeline play, pause, resume, restart, jump-to-step, synced teaching cues</div>
                <div className="rounded-[1.2rem] border border-white/10 bg-slate-950/70 p-4"><BookOpen className="mb-2 h-4 w-4 text-cyan-300" /> VR-ready and AR-ready architecture flags for future expansion</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
