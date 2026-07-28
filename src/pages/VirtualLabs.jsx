import { useEffect, useMemo, useState } from 'react';
import { addDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { Sparkles, Search, Play, Pause, RotateCcw, Gauge, ZoomIn, RotateCw, Maximize2, StepForward, StepBack, BookOpen, ShieldCheck, FlaskConical, Trophy, Bookmark, Star, History, BrainCircuit } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase/firebaseConfig';
import { buildLabRecommendations, buildVirtualLab } from '../utils/virtualLabUtils';
import LabCard from '../components/virtualLabs/LabCard';
import LabSearch from '../components/virtualLabs/LabSearch';
import LoadingLab from '../components/virtualLabs/LoadingLab';
import SimulationViewer from '../components/virtualLabs/SimulationViewer';
import TheoryPanel from '../components/virtualLabs/TheoryPanel';
import ProcedurePanel from '../components/virtualLabs/ProcedurePanel';
import ExperimentPanel from '../components/virtualLabs/ExperimentPanel';
import ResultPanel from '../components/virtualLabs/ResultPanel';
import SafetyPanel from '../components/virtualLabs/SafetyPanel';
import LabHistory from '../components/virtualLabs/LabHistory';

export default function VirtualLabs() {
  const { user } = useAuth();
  const [searchText, setSearchText] = useState('Build a DC Motor');
  const [lab, setLab] = useState(() => buildVirtualLab('Build a DC Motor'));
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [history, setHistory] = useState([]);
  const [savedLabs, setSavedLabs] = useState([]);
  const [favoriteLabs, setFavoriteLabs] = useState([]);
  const [completedLabs, setCompletedLabs] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [results, setResults] = useState('');
  const [score, setScore] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const loadHistory = async () => {
      if (!user?.uid) return;
      try {
        const q = query(collection(db, 'virtualLabHistory'), where('userId', '==', user.uid));
        const snapshot = await getDocs(q);
        const entries = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setHistory(entries);
        setCompletedLabs(entries.filter((entry) => entry.completed).map((entry) => entry.experiment));
      } catch (error) {
        console.error('Unable to load virtual lab history:', error);
        setOffline(true);
      }
    };

    loadHistory();
  }, [user?.uid]);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setCurrentStep((value) => (value + 1) % Math.max(lab.simulation.steps.length, 1));
    }, 1200 / speed);
    return () => clearInterval(interval);
  }, [isPlaying, lab.simulation.steps.length, speed]);

  const recommendations = useMemo(() => buildLabRecommendations(searchText, history.length), [searchText, history.length]);

  const handleGenerateLab = () => {
    const nextLab = buildVirtualLab(searchText || 'Universal Experiment');
    setLab(nextLab);
    setResults('');
    setScore(0);
    setCurrentStep(0);
    setIsPlaying(false);
  };

  const handleCompleteLab = async () => {
    const nextScore = Math.min(100, Math.max(60, 70 + Math.round((currentStep + 1) * 5)));
    const nextResults = `${lab.results}\nObservation summary: ${lab.observations[0]}`;
    setResults(nextResults);
    setScore(nextScore);
    setCompletedLabs((value) => Array.from(new Set([...value, lab.title])));

    if (!user?.uid) {
      setOffline(true);
      return;
    }

    try {
      await addDoc(collection(db, 'virtualLabHistory'), {
        userId: user.uid,
        experiment: lab.title,
        results: nextResults,
        duration: 12 + currentStep,
        completed: true,
        score: nextScore,
        createdAt: new Date()
      });
      const q = query(collection(db, 'virtualLabHistory'), where('userId', '==', user.uid));
      const snapshot = await getDocs(q);
      const entries = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setHistory(entries);
      setCompletedLabs(entries.filter((entry) => entry.completed).map((entry) => entry.experiment));
    } catch (error) {
      console.error('Unable to save virtual lab history:', error);
      setOffline(true);
    }
  };

  const toggleSaved = () => {
    setSavedLabs((value) => (value.includes(lab.title) ? value.filter((item) => item !== lab.title) : [...value, lab.title]));
  };

  const toggleFavorite = () => {
    setFavoriteLabs((value) => (value.includes(lab.title) ? value.filter((item) => item !== lab.title) : [...value, lab.title]));
  };

  if (loading) return <LoadingLab />;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.16),_transparent_35%),linear-gradient(135deg,_#020617_0%,_#0f172a_45%,_#111827_100%)] px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <div className="rounded-[2rem] border border-white/10 bg-slate-900/75 p-6 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-cyan-300">Universal Virtual Laboratory</p>
              <h1 className="mt-2 text-3xl font-semibold text-white sm:text-4xl">Perform AI-powered experiments for any topic, skill, or industry</h1>
              <p className="mt-3 max-w-2xl text-sm text-slate-400 sm:text-base">Generate practical labs dynamically, explore interactive simulations, and capture results without being limited to a fixed category list.</p>
            </div>
            <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100">
              <div className="flex items-center gap-2"><Sparkles className="h-4 w-4" /> Live AI Lab Engine</div>
            </div>
          </div>
        </div>

        {offline ? <div className="rounded-[1.5rem] border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-300">History sync is temporarily unavailable, but the lab engine remains fully usable.</div> : null}

        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <div className="rounded-[2rem] border border-white/10 bg-slate-900/75 p-4 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
              <LabSearch value={searchText} onChange={setSearchText} onGenerate={handleGenerateLab} />
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-slate-900/75 p-4 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
              <LabCard
                lab={lab}
                saved={savedLabs.includes(lab.title)}
                favorite={favoriteLabs.includes(lab.title)}
                onSave={toggleSaved}
                onFavorite={toggleFavorite}
                completed={completedLabs.includes(lab.title)}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/75 p-4">
                <div className="flex items-center gap-2 text-emerald-300"><Trophy className="h-4 w-4" /> Completed</div>
                <p className="mt-3 text-3xl font-semibold text-white">{completedLabs.length}</p>
              </div>
              <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/75 p-4">
                <div className="flex items-center gap-2 text-amber-300"><Bookmark className="h-4 w-4" /> Saved</div>
                <p className="mt-3 text-3xl font-semibold text-white">{savedLabs.length}</p>
              </div>
              <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/75 p-4">
                <div className="flex items-center gap-2 text-violet-300"><Star className="h-4 w-4" /> Favorites</div>
                <p className="mt-3 text-3xl font-semibold text-white">{favoriteLabs.length}</p>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <TheoryPanel lab={lab} />
              <ProcedurePanel lab={lab} />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <ExperimentPanel lab={lab} />
              <SafetyPanel lab={lab} />
            </div>
          </div>

          <div className="space-y-6">
            <SimulationViewer
              lab={lab}
              isPlaying={isPlaying}
              currentStep={currentStep}
              speed={speed}
              zoom={zoom}
              rotation={rotation}
              isFullscreen={isFullscreen}
              onPlayPause={() => setIsPlaying((value) => !value)}
              onReset={() => { setCurrentStep(0); setIsPlaying(false); }}
              onStepBack={() => setCurrentStep((value) => (value - 1 + lab.simulation.steps.length) % lab.simulation.steps.length)}
              onStepForward={() => setCurrentStep((value) => (value + 1) % lab.simulation.steps.length)}
              onSpeedChange={setSpeed}
              onZoomChange={setZoom}
              onRotateChange={setRotation}
              onFullscreen={() => setIsFullscreen((value) => !value)}
            />

            <ResultPanel lab={lab} results={results} score={score} onComplete={handleCompleteLab} />

            <div className="rounded-[2rem] border border-white/10 bg-slate-900/75 p-5 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
              <div className="flex items-center gap-2 text-cyan-300"><BrainCircuit className="h-4 w-4" /> Personalized next steps</div>
              <ul className="mt-4 space-y-2 text-sm text-slate-400">
                {recommendations.map((item) => <li key={item} className="rounded-[1rem] border border-white/10 bg-slate-950/70 p-3">{item}</li>)}
              </ul>
            </div>

            <LabHistory history={history} />
          </div>
        </div>
      </div>
    </div>
  );
}
