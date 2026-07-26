import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Search, Sparkles, BookOpen, Cpu, Layers3, Fullscreen, RefreshCw, BrainCircuit } from 'lucide-react';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { categories, filterModels, getModelById } from '../utils/learning3dUtils';
import { buildUniversalLesson } from '../utils/learning3dUniversal';
import SceneCanvas from '../components/3d/SceneCanvas';
import CameraControls from '../components/3d/CameraControls';
import ModelSelector from '../components/3d/ModelSelector';
import AnnotationLabel from '../components/3d/AnnotationLabel';
import ConceptMapView from '../components/3d/ConceptMapView';

const explanationMap = {
  heart: {
    parts: ['Atria', 'Ventricles', 'Valves'],
    functions: 'Pumps blood throughout the body while maintaining circulation.',
    working: 'The chambers coordinate contractions to move oxygen-rich and oxygen-poor blood efficiently.',
    applications: 'Used in medical training, cardiovascular diagnostics, and health education.',
    interviewQuestions: ['How does the heart maintain a heartbeat?', 'What is the role of valves?'],
    practiceQuestions: ['Name the four chambers of the heart.', 'How do valves affect circulation?']
  },
  brain: {
    parts: ['Cerebrum', 'Cerebellum', 'Brainstem'],
    functions: 'Coordinates thought, balance, and essential autonomic functions.',
    working: 'Neural signals pass through regions to interpret data and govern movement.',
    applications: 'Useful in neuroscience, mental health training, and AI-inspired neural networks.',
    interviewQuestions: ['How do the cerebrum and cerebellum differ?', 'Why is the brainstem critical?'],
    practiceQuestions: ['List the main brain regions.', 'Explain how the brain controls movement.']
  },
  'solar-system': {
    parts: ['Sun', 'Earth', 'Mars'],
    functions: 'Shows planetary motion and the structure of our star system.',
    working: 'Gravity and orbital motion determine how planets move around the sun.',
    applications: 'Supports astronomy lessons, cosmology, and mission planning.',
    interviewQuestions: ['What keeps planets in orbit?', 'Why do planets have different years?'],
    practiceQuestions: ['Name the terrestrial planets.', 'Explain the role of gravity in orbits.']
  },
  'electric-motor': {
    parts: ['Rotor', 'Stator', 'Coils'],
    functions: 'Converts electrical energy into rotational mechanical motion.',
    working: 'Magnetic fields push and pull the rotor as current flows through the coils.',
    applications: 'Found in drones, appliances, robotics, and transportation systems.',
    interviewQuestions: ['What is the difference between rotor and stator?', 'How does magnetic field interaction create motion?'],
    practiceQuestions: ['Explain how current induces rotation.', 'Name a real-world use of an electric motor.']
  },
  'dna': {
    parts: ['Base Pairs', 'Sugar Backbone', 'Helix Twist'],
    functions: 'Stores hereditary information and supports biological replication.',
    working: 'The double helix preserves sequence information and enables copying.',
    applications: 'Used in genetics, biotechnology, and medical research.',
    interviewQuestions: ['What is the purpose of base pairing?', 'Why is DNA called the blueprint of life?'],
    practiceQuestions: ['Describe the structure of DNA.', 'How does DNA replicate?']
  },
  atom: {
    parts: ['Nucleus', 'Electrons', 'Orbitals'],
    functions: 'Represents the fundamental building block of matter.',
    working: 'Protons and neutrons form the nucleus while electrons occupy orbitals.',
    applications: 'Essential for chemistry, materials science, and quantum concepts.',
    interviewQuestions: ['What makes an atom neutral?', 'What does the nucleus contain?'],
    practiceQuestions: ['Name the three main subatomic particles.', 'How do electrons differ from protons?']
  },
  'earth-layers': {
    parts: ['Crust', 'Mantle', 'Core'],
    functions: 'Shows how the structure of Earth influences geology and tectonics.',
    working: 'Heat and pressure create movement and geological activity across layers.',
    applications: 'Useful for environmental science, volcanology, and geology careers.',
    interviewQuestions: ['What is the thinnest layer of Earth?', 'How do tectonic plates interact?'],
    practiceQuestions: ['Identify Earth’s major layers.', 'Explain the role of the mantle.']
  },
  cell: {
    parts: ['Membrane', 'Nucleus', 'Organelles'],
    functions: 'Represents the smallest functional unit of life.',
    working: 'Organelles coordinate tasks that keep the cell alive and active.',
    applications: 'Found in biology, microsystems, and healthcare education.',
    interviewQuestions: ['What is the function of the cell membrane?', 'Why is the nucleus important?'],
    practiceQuestions: ['Describe the role of organelles.', 'Explain what makes a cell alive.']
  },
  cpu: {
    parts: ['Core', 'Cache', 'Registers'],
    functions: 'Executes instructions and supports computation for digital devices.',
    working: 'Data moves between components to fetch, decode, and process instructions.',
    applications: 'Important for computer engineering, embedded systems, and hardware interviews.',
    interviewQuestions: ['How does a CPU process instructions?', 'What does cache improve?'],
    practiceQuestions: ['Describe the role of the CPU core.', 'Why is cache important for performance?']
  },
  bridge: {
    parts: ['Deck', 'Supports', 'Tension Members'],
    functions: 'Illustrates how structures manage load and maintain stability.',
    working: 'Load paths transfer weight into supports and foundations.',
    applications: 'Helpful for civil engineering, structural design, and architecture careers.',
    interviewQuestions: ['How do supports increase stability?', 'What role do tension members play?'],
    practiceQuestions: ['Name the structural parts of a bridge.', 'How does a bridge distribute load?']
  }
};

export default function Learning3D() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedModelId, setSelectedModelId] = useState('heart');
  const [selectedPart, setSelectedPart] = useState('Atria');
  const [selectedNode, setSelectedNode] = useState('');
  const [autoRotate, setAutoRotate] = useState(true);
  const [explodeView, setExplodeView] = useState(false);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);

  const models = useMemo(() => filterModels(query, selectedCategory), [query, selectedCategory]);
  const universalLesson = useMemo(() => buildUniversalLesson(query || 'Learning Topic'), [query]);
  const activeModel = selectedModelId === 'universal'
    ? { id: 'universal', name: query || 'Universal Concept Map', category: 'Universal', description: universalLesson.summary }
    : getModelById(selectedModelId);
  const explanation = explanationMap[selectedModelId] || explanationMap.heart;
  const showUniversalFallback = Boolean(query && models.length === 0);
  const selectorModels = useMemo(() => (showUniversalFallback ? [{ id: 'universal', name: 'Universal Concept Map', category: 'Dynamic' }] : models), [models, showUniversalFallback]);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    setSelectedNode('');
    setSelectedPart('Core');
  }, [query, selectedModelId]);

  useEffect(() => {
    if (query && models.length === 0) {
      setSelectedModelId('universal');
      return;
    }

    if (selectedModelId === 'universal' && models.length > 0) {
      setSelectedModelId(models[0]?.id || 'heart');
    }
  }, [query, models, selectedModelId]);

  useEffect(() => {
    if (!user?.uid) return;
    const saveHistory = async () => {
      try {
        await addDoc(collection(db, 'learning3DHistory'), {
          userId: user.uid,
          modelName: activeModel.name,
          category: activeModel.category,
          timeSpent: 5,
          lastViewed: new Date(),
          createdAt: new Date()
        });
      } catch (error) {
        console.error('Error saving learning 3D history:', error);
        setOffline(true);
      }
    };
    saveHistory();
  }, [activeModel?.name, activeModel?.category, user?.uid]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.16),_transparent_35%),linear-gradient(135deg,_#020617_0%,_#0f172a_45%,_#111827_100%)] px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <div className="rounded-[2rem] border border-white/10 bg-slate-900/75 p-6 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-emerald-300">Professional 3D Learning Engine</p>
              <h1 className="mt-2 text-3xl font-semibold text-white sm:text-4xl">Explore ideas in motion with interactive 3D models</h1>
              <p className="mt-3 max-w-2xl text-sm text-slate-400 sm:text-base">Search concepts, inspect each part, and learn from AI-guided explanations that connect visuals to real-world understanding.</p>
            </div>
            <button onClick={() => navigate('/dashboard')} className="rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-2 text-sm text-slate-200">Back to Dashboard</button>
          </div>
        </div>

        {offline ? <div className="rounded-[1.5rem] border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-300">History syncing is temporarily unavailable, but the 3D experience remains available.</div> : null}

        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <div className="rounded-[2rem] border border-white/10 bg-slate-900/75 p-4 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
              <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-2 text-emerald-300"><Search className="h-4 w-4" /> Universal knowledge search</div>
                <div className="flex flex-wrap gap-2">
                  <select value={selectedCategory} onChange={(event) => setSelectedCategory(event.target.value)} className="rounded-full border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-slate-200">
                    <option value="All">All Categories</option>
                    {categories.map((category) => <option key={category} value={category}>{category}</option>)}
                  </select>
                  <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Try any topic: AI, Accounting, Solar System..." className="rounded-full border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-slate-200 outline-none" />
                </div>
              </div>
              <ModelSelector models={selectorModels} selectedModelId={selectedModelId} onSelect={setSelectedModelId} />
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-slate-900/75 p-4 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Interactive 3D Model</p>
                  <h2 className="text-xl font-semibold text-white">{showUniversalFallback ? query || 'Universal Concept Map' : activeModel.name}</h2>
                </div>
                <CameraControls onReset={() => setSelectedPart(activeModel.name)} onToggleRotate={() => setAutoRotate((value) => !value)} autoRotate={autoRotate} onToggleExplode={() => setExplodeView((value) => !value)} />
              </div>
              {loading ? <div className="rounded-[2rem] border border-white/10 bg-slate-950/70 p-8 text-center text-slate-400">Preparing your immersive lesson...</div> : showUniversalFallback ? (
                <div className="space-y-4 rounded-[2rem] border border-white/10 bg-slate-950/70 p-5">
                  <div className="rounded-[1.2rem] border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-100">
                    No exact 3D model was found, so Daksha AI generated an adaptive concept visualization for your topic.
                  </div>
                  <ConceptMapView concept={universalLesson} selectedNode={selectedNode} onSelectNode={setSelectedNode} />
                </div>
              ) : <SceneCanvas model={activeModel} selectedPart={selectedPart} onSelectPart={setSelectedPart} />}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[2rem] border border-white/10 bg-slate-900/75 p-5 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
              <div className="flex items-center gap-2 text-emerald-300"><Sparkles className="h-4 w-4" /> AI Explanation Panel</div>
              <h3 className="mt-3 text-xl font-semibold text-white">{query || activeModel.name}</h3>
              <p className="mt-2 text-sm text-slate-400">{showUniversalFallback ? universalLesson.summary : activeModel.description}</p>
              <div className="mt-4 grid gap-3">
                <div className="rounded-[1.2rem] border border-white/10 bg-slate-950/70 p-4">
                  <p className="text-sm font-semibold text-white">Concept structure</p>
                  <div className="mt-2 flex flex-wrap gap-2">{(showUniversalFallback ? universalLesson.conceptMap : explanation.parts).map((part) => <AnnotationLabel key={typeof part === 'string' ? part : part.label} label={typeof part === 'string' ? part : part.label} active={selectedPart === (typeof part === 'string' ? part : part.label) || selectedNode === (typeof part === 'string' ? part : part.label)} onClick={() => { setSelectedPart(typeof part === 'string' ? part : part.label); setSelectedNode(typeof part === 'string' ? part : part.label); }} />)}</div>
                </div>
                <div className="rounded-[1.2rem] border border-white/10 bg-slate-950/70 p-4">
                  <p className="text-sm font-semibold text-white">Functions</p>
                  <p className="mt-2 text-sm text-slate-400">{showUniversalFallback ? universalLesson.sections[0]?.body : explanation.functions}</p>
                </div>
                <div className="rounded-[1.2rem] border border-white/10 bg-slate-950/70 p-4">
                  <p className="text-sm font-semibold text-white">Working</p>
                  <p className="mt-2 text-sm text-slate-400">{showUniversalFallback ? universalLesson.sections[1]?.body : explanation.working}</p>
                </div>
                <div className="rounded-[1.2rem] border border-white/10 bg-slate-950/70 p-4">
                  <p className="text-sm font-semibold text-white">Real-world applications</p>
                  <p className="mt-2 text-sm text-slate-400">{showUniversalFallback ? universalLesson.sections[2]?.body : explanation.applications}</p>
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-slate-900/75 p-5 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
              <div className="flex items-center gap-2 text-sky-300"><BrainCircuit className="h-4 w-4" /> Interview & Practice</div>
              <div className="mt-4 space-y-3">
                <div className="rounded-[1.2rem] border border-white/10 bg-slate-950/70 p-4">
                  <p className="text-sm font-semibold text-white">Common interview questions</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-400">{(showUniversalFallback ? universalLesson.conceptMap : explanation.interviewQuestions).map((item) => <li key={typeof item === 'string' ? item : item.label}>{typeof item === 'string' ? item : item.label}</li>)}</ul>
                </div>
                <div className="rounded-[1.2rem] border border-white/10 bg-slate-950/70 p-4">
                  <p className="text-sm font-semibold text-white">Practice questions</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-400">{(showUniversalFallback ? universalLesson.sections[3]?.body.split('.').filter(Boolean) : explanation.practiceQuestions).map((item) => <li key={item}>{item}</li>)}</ul>
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-slate-900/75 p-5 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
              <div className="flex items-center gap-2 text-violet-300"><Layers3 className="h-4 w-4" /> Recent Models</div>
              <div className="mt-4 grid gap-3">
                <div className="rounded-[1.2rem] border border-white/10 bg-slate-950/70 p-4 text-sm text-slate-300">Recently viewed: {query || activeModel.name}</div>
                <div className="rounded-[1.2rem] border border-white/10 bg-slate-950/70 p-4 text-sm text-slate-300">Favorites: Dynamic concept maps and AI visuals</div>
                <div className="rounded-[1.2rem] border border-white/10 bg-slate-950/70 p-4 text-sm text-slate-300">Most explored: Any subject, course, skill, or product</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
