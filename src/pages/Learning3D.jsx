import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Search, Sparkles, BookOpen, Layers3, BrainCircuit, Target, Focus, PlayCircle, Film, Camera, Monitor, Save } from 'lucide-react';
import AnnotationLabel from '../components/3d/AnnotationLabel';
import SceneTimeline from '../components/3d/SceneTimeline';
import {
  getUserSceneBookmarks,
  saveSceneHistory,
  saveUserBookmark
} from '../services/firestoreService';

const SceneLoader = lazy(() => import('../components/3d/SceneLoader'));
const SceneViewer = lazy(() => import('../components/3d/SceneViewer'));
const SceneController = lazy(() => import('../components/3d/SceneController'));
const SceneDirector = lazy(() => import('../components/3d/SceneDirector'));

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

const lessonModes = [
  'Teaching Mode',
  'Presentation Mode',
  'Practice Mode',
  'Simulation Mode',
  'Exam Mode',
  'Free Exploration Mode'
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

function buildQuestionAnswer(question = '', scene = null, selectedPart = '') {
  const normalized = String(question || '').toLowerCase();
  const object = (scene?.objects || []).find((item) => item.label === selectedPart) || scene?.objects?.[0];
  if (!object) return 'This is a key part of the lesson scene. I can explain function, working, and real-world use.';
  if (normalized.includes('what is this') || normalized.includes('what is that')) {
    return `${object.label} belongs to ${object.category}. ${object.facts?.[0] || 'It is important for this lesson flow.'}`;
  }
  if (normalized.includes('function')) {
    return object.facts?.[0] || `${object.label} supports the main process.`;
  }
  if (normalized.includes('working') || normalized.includes('work')) {
    return object.facts?.[1] || `${object.label} works together with other parts in this scene.`;
  }
  return `${object.label}: ${object.facts?.join(' ') || 'Core concept in this scene.'}`;
}

function captureCanvasScreenshot() {
  try {
    const canvas = document.querySelector('canvas');
    if (!canvas) return null;
    return canvas.toDataURL('image/png');
  } catch (error) {
    console.error('Unable to capture screenshot:', error);
    return null;
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
  const [cameraMode, setCameraMode] = useState('orbit');
  const [highlightMode, setHighlightMode] = useState('glow');
  const [environmentPreset, setEnvironmentPreset] = useState('classroom');
  const [sceneEffects, setSceneEffects] = useState([]);
  const [pausedByLearner, setPausedByLearner] = useState(false);
  const [lessonMode, setLessonMode] = useState(lessonModes[0]);
  const [learnerQuestion, setLearnerQuestion] = useState('');
  const [learnerAnswer, setLearnerAnswer] = useState('');
  const [isPipMode, setIsPipMode] = useState(false);
  const [lodLevel, setLodLevel] = useState('high');
  const [performanceProfile, setPerformanceProfile] = useState('balanced');
  const [bookmarks, setBookmarks] = useState([]);

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
    if (!user?.uid) return;
    let active = true;
    getUserSceneBookmarks(user.uid).then((items) => {
      if (active) setBookmarks(items.slice(0, 8));
    }).catch((error) => {
      console.error('Unable to load bookmarks:', error);
    });

    return () => {
      active = false;
    };
  }, [user?.uid]);

  useEffect(() => {
    if (!sceneSteps.length || !isTimelinePlaying || animationPaused || pausedByLearner) return undefined;

    const step = sceneSteps[activeStepIndex] || sceneSteps[0];
    const duration = Math.max(1000, Math.round((step?.durationMs || 1600) / Math.max(0.5, motionSpeed)));
    const timer = setTimeout(() => {
      setActiveStepIndex((value) => (value + 1) % sceneSteps.length);
    }, duration);

    return () => clearTimeout(timer);
  }, [sceneSteps, activeStepIndex, isTimelinePlaying, animationPaused, motionSpeed, pausedByLearner]);

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
    setCameraMode('orbit');
    setHighlightMode('glow');
    setSceneEffects([]);
    setPausedByLearner(false);
  };

  const loadAITeacherLesson = () => {
    const context = readTeacherContextFromStorage();
    if (context) {
      setSourcePayload(context);
      setSourceContent(context);
      setSourceType('ai-teacher-lesson');
    }
  };

  const handlePauseLesson = () => {
    setPausedByLearner(true);
    setAnimationPaused(true);
    setIsTimelinePlaying(false);
  };

  const handleResumeLesson = () => {
    setPausedByLearner(false);
    setAnimationPaused(false);
    setIsTimelinePlaying(true);
  };

  const handleAskQuestion = async (question) => {
    setLearnerQuestion(question);
    const answer = buildQuestionAnswer(question, sceneData, selectedPart);
    setLearnerAnswer(answer);

    if (user?.uid) {
      await saveSceneHistory(user.uid, {
        sceneId,
        type: 'learner-question',
        question,
        answer,
        stepIndex: activeStepIndex,
        target: selectedPart || ''
      });
    }
  };

  const handleBookmark = async (bookmark) => {
    if (!user?.uid) return;
    const payload = {
      ...bookmark,
      sceneId: sceneId || bookmark.sceneId || 'scene',
      lessonMode,
      topic,
      stepTitle: sceneSteps[bookmark.stepIndex]?.title || `Step ${bookmark.stepIndex + 1}`
    };
    await saveUserBookmark(user.uid, payload);
    setBookmarks((value) => [payload, ...value].slice(0, 8));
  };

  const handleHistory = async (entry) => {
    if (!user?.uid) return;
    await saveSceneHistory(user.uid, {
      ...entry,
      sceneId: sceneId || 'scene',
      lessonMode,
      topic
    });
  };

  const handleJumpToBookmark = (bookmark) => {
    const targetIndex = Number.isFinite(bookmark.stepIndex) ? bookmark.stepIndex : 0;
    setActiveStepIndex(Math.max(0, Math.min(sceneSteps.length - 1, targetIndex)));
    if (bookmark.target) setSelectedPart(bookmark.target);
    if (bookmark.cameraMode) setCameraMode(bookmark.cameraMode);
  };

  const handleStudioScreenshot = async () => {
    const screenshot = captureCanvasScreenshot();
    if (!screenshot || !user?.uid) return;
    await saveSceneHistory(user.uid, {
      sceneId: sceneId || 'scene',
      type: 'scene-screenshot',
      screenshot,
      stepIndex: activeStepIndex,
      target: selectedPart || ''
    });
  };

  const handleExportSceneNotes = async () => {
    const note = [
      `Topic: ${topic}`,
      `Mode: ${lessonMode}`,
      `Camera: ${cameraMode}`,
      `Environment: ${environmentPreset}`,
      `Step: ${sceneSteps[activeStepIndex]?.title || 'N/A'}`,
      `Selection: ${selectedPart || 'none'}`,
      `Answer: ${learnerAnswer || 'none'}`
    ].join('\n');

    const blob = new Blob([note], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `daksha-scene-notes-${Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(link.href);

    await handleHistory({ type: 'scene-notes-exported', note, stepIndex: activeStepIndex });
  };

  const togglePipMode = () => {
    setIsPipMode((value) => !value);
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.16),_transparent_35%),linear-gradient(135deg,_#020617_0%,_#0f172a_45%,_#111827_100%)] px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <div className="rounded-[2rem] border border-white/10 bg-slate-900/75 p-6 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-emerald-300">AI Scene Director • Cinematic Learning Engine</p>
              <h1 className="mt-2 text-3xl font-semibold text-white sm:text-4xl">Documentary-grade interactive lessons directed by AI Teacher</h1>
              <p className="mt-3 max-w-3xl text-sm text-slate-400 sm:text-base">The director automates camera movement, transitions, highlights, labels, animation timing, narration synchronization, environment presets, and replay workflows in a professional 3D studio interface.</p>
            </div>
            <button onClick={() => navigate('/dashboard')} className="rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-2 text-sm text-slate-200">Back to Dashboard</button>
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-slate-900/75 p-4 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
          <div className="grid gap-3 lg:grid-cols-4">
            <label className="text-xs text-slate-300">
              Lesson Mode
              <select value={lessonMode} onChange={(event) => setLessonMode(event.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-xs text-slate-200">
                {lessonModes.map((mode) => <option key={mode} value={mode}>{mode}</option>)}
              </select>
            </label>
            <label className="text-xs text-slate-300">
              LOD
              <select value={lodLevel} onChange={(event) => setLodLevel(event.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-xs text-slate-200">
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </label>
            <label className="text-xs text-slate-300">
              Performance Profile
              <select value={performanceProfile} onChange={(event) => setPerformanceProfile(event.target.value)} className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-xs text-slate-200">
                <option value="balanced">Balanced 60 FPS</option>
                <option value="quality">Quality</option>
                <option value="battery-saver">Battery Saver</option>
              </select>
            </label>
            <div className="flex items-end gap-2">
              <button onClick={handleFullscreen} className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-xs text-slate-200">Fullscreen</button>
              <button onClick={togglePipMode} className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-xs text-slate-200">{isPipMode ? 'Close PiP' : 'Picture-in-Picture'}</button>
            </div>
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
                    onToggleAnimation={() => {
                      setAnimationPaused((value) => !value);
                      setAutoRotate((value) => !value);
                    }}
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
                        setSceneData({ ...scene, id: generatedSceneId || scene?.id || '' });
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
                        cameraMode={cameraMode}
                        highlightMode={highlightMode}
                        environmentPreset={environmentPreset}
                        sceneEffects={sceneEffects}
                        activeTimelineStep={currentStep}
                        showDynamicLabels={showLabels}
                        lodLevel={lodLevel}
                        performanceProfile={performanceProfile}
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

                  <Suspense fallback={<div className="text-sm text-slate-400">Loading director...</div>}>
                    <SceneDirector
                      scene={sceneData}
                      scenePlan={scenePlan}
                      content={effectiveContent}
                      selectedPart={selectedPart}
                      activeIndex={activeStepIndex}
                      isTimelinePlaying={isTimelinePlaying}
                      pausedByLearner={pausedByLearner}
                      onPauseLesson={handlePauseLesson}
                      onResumeLesson={handleResumeLesson}
                      onJumpStep={(index) => setActiveStepIndex(index)}
                      onCameraModeChange={(mode) => setCameraMode(mode)}
                      onHighlightModeChange={(mode) => setHighlightMode(mode)}
                      onEnvironmentChange={setEnvironmentPreset}
                      onEffectsChange={setSceneEffects}
                      onBookmark={handleBookmark}
                      onHistory={handleHistory}
                      onAskQuestion={handleAskQuestion}
                    />
                  </Suspense>
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
                  <p className="text-sm font-semibold text-white">Cinematic direction state</p>
                  <p className="mt-2 text-sm text-slate-400">Mode: {lessonMode}</p>
                  <p className="mt-2 text-sm text-slate-400">Camera: {cameraMode}</p>
                  <p className="mt-2 text-sm text-slate-400">Environment: {environmentPreset}</p>
                  <p className="mt-2 text-sm text-slate-400">Effects: {sceneEffects.join(', ') || 'none'}</p>
                  <p className="mt-2 text-sm text-slate-400">Scene ID: {sceneId || 'pending'}</p>
                </div>
                <div className="rounded-[1.2rem] border border-white/10 bg-slate-950/70 p-4">
                  <p className="text-sm font-semibold text-white">Interactive pause and learner Q&A</p>
                  <p className="mt-2 text-sm text-slate-400">Question: {learnerQuestion || 'No question yet.'}</p>
                  <p className="mt-2 text-sm text-cyan-200">Answer: {learnerAnswer || 'Ask a question from the director panel.'}</p>
                  <p className="mt-2 text-xs text-slate-500">State: {pausedByLearner ? 'Paused and waiting' : 'Running'}</p>
                </div>
                <div className="rounded-[1.2rem] border border-white/10 bg-slate-950/70 p-4">
                  <p className="text-sm font-semibold text-white">Scene replay actions</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button onClick={() => setActiveStepIndex(0)} className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-200"><PlayCircle className="mr-1 inline h-3.5 w-3.5" />Replay</button>
                    <button onClick={() => setActiveStepIndex((value) => Math.min(sceneSteps.length - 1, value + 1))} className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-200"><Film className="mr-1 inline h-3.5 w-3.5" />Skip</button>
                    <button onClick={handleStudioScreenshot} className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-200"><Camera className="mr-1 inline h-3.5 w-3.5" />Screenshot</button>
                    <button onClick={handleExportSceneNotes} className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-200"><Save className="mr-1 inline h-3.5 w-3.5" />Export Notes</button>
                  </div>
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
              <div className="flex items-center gap-2 text-violet-300"><Layers3 className="h-4 w-4" /> Scene Navigator + Bookmarks</div>
              <div className="mt-4 space-y-2">
                {bookmarks.length === 0 ? <p className="text-sm text-slate-400">No saved moments yet.</p> : bookmarks.map((bookmark, index) => (
                  <button
                    key={`${bookmark.sceneId || 'scene'}-${bookmark.stepIndex || index}-${index}`}
                    type="button"
                    onClick={() => handleJumpToBookmark(bookmark)}
                    className="w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-left"
                  >
                    <p className="text-sm font-semibold text-white">{bookmark.stepTitle || `Step ${bookmark.stepIndex + 1}`}</p>
                    <p className="text-xs text-slate-400">{bookmark.topic || topic} • {bookmark.cameraMode || 'orbit'} • {bookmark.environment || environmentPreset}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-slate-900/75 p-5 shadow-2xl shadow-slate-950/40 backdrop-blur-xl resize-y overflow-auto">
              <div className="flex items-center gap-2 text-violet-300"><Monitor className="h-4 w-4" /> Performance Engine</div>
              <div className="mt-4 grid gap-3 text-sm text-slate-300">
                <div className="rounded-[1.2rem] border border-white/10 bg-slate-950/70 p-4"><Target className="mb-2 h-4 w-4 text-cyan-300" /> 60 FPS target with LOD, streaming-ready object limits, and profile-based motion controls.</div>
                <div className="rounded-[1.2rem] border border-white/10 bg-slate-950/70 p-4"><Focus className="mb-2 h-4 w-4 text-cyan-300" /> Occlusion-style focus by isolating active parts and reducing scene clutter dynamically.</div>
                <div className="rounded-[1.2rem] border border-white/10 bg-slate-950/70 p-4"><PlayCircle className="mb-2 h-4 w-4 text-cyan-300" /> Scene caching, lazy loading, timeline sync, and repeatable replay workflow for teacher-led lessons.</div>
                <div className="rounded-[1.2rem] border border-white/10 bg-slate-950/70 p-4"><BookOpen className="mb-2 h-4 w-4 text-cyan-300" /> Camera presets, environment presets, lesson animations, bookmarks, and scene history are persisted in Firebase collections.</div>
              </div>
            </div>
          </div>
        </div>

        {isPipMode ? (
          <div className="fixed bottom-4 right-4 z-50 w-[330px] rounded-2xl border border-cyan-500/30 bg-slate-950/90 p-3 shadow-2xl shadow-black/60 backdrop-blur-xl">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.3em] text-cyan-300">Picture-in-Picture</p>
              <button onClick={togglePipMode} className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-200">Close</button>
            </div>
            <p className="text-xs text-slate-300">Scene: {sceneData?.title || 'N/A'}</p>
            <p className="mt-1 text-xs text-slate-400">Step: {sceneSteps[activeStepIndex]?.title || 'N/A'}</p>
            <p className="mt-1 text-xs text-slate-400">Camera: {cameraMode} • Mode: {lessonMode}</p>
            <p className="mt-2 text-[11px] text-cyan-200">This compact panel keeps playback context visible while browsing other sections.</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
