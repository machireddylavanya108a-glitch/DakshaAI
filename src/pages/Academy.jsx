import { useMemo, useState, useEffect } from 'react';
import { Search, Loader, BookOpen, Brain, GraduationCap, Briefcase, PenTool, HelpCircle, Layers, StickyNote, FileText, Network, Save, CheckCircle, Code, Music, HeartPulse, Wrench, Camera, ArrowRight, Trophy, Sparkles, RotateCcw, Copy, Download, Target, TrendingUp, BriefcaseBusiness, ShieldCheck, BadgeCheck } from 'lucide-react';
import { getUserPersonalizedLearningPlans, savePersonalizedLearningPlan, deletePersonalizedLearningPlan } from '../services/firestoreService';
import { useAuth } from '../context/AuthContext';
import SkillCard from '../components/academy/SkillCard';
import SkillSection from '../components/academy/SkillSection';
import SkillHeader from '../components/academy/SkillHeader';
import LoadingAcademy from '../components/academy/LoadingAcademy';
import LearningInterviewModal from '../components/common/LearningInterviewModal';
import PersonalizedLearningDashboard from '../components/common/PersonalizedLearningDashboard';
import { buildPersonalizedLearningPlan } from '../utils/personalizedLearningEngine';

const skillCards = [
  { icon: Code, title: 'Python', description: 'Build automation, web apps, AI tools, and data workflows.' },
  { icon: Code, title: 'React', description: 'Create modern interfaces and production-ready frontend experiences.' },
  { icon: Brain, title: 'AI', description: 'Understand prompt design, model workflows, and practical AI products.' },
  { icon: ShieldCheck, title: 'Cybersecurity', description: 'Learn defense, analysis, and security operations fundamentals.' },
  { icon: TrendingUp, title: 'Trading', description: 'Explore strategy, risk management, and market analysis.' },
  { icon: Camera, title: 'Graphic Design', description: 'Create visual systems, branding, and portfolio work.' },
  { icon: Camera, title: 'Video Editing', description: 'Edit stories, create reels, and master modern production tools.' },
  { icon: BriefcaseBusiness, title: 'Business', description: 'Learn strategy, operations, growth, and startup thinking.' },
];

export default function Academy() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [learningPlan, setLearningPlan] = useState(null);
  const [savedRoadmaps, setSavedRoadmaps] = useState([]);
  const [activeSkill, setActiveSkill] = useState('Python');
  const [savedStatus, setSavedStatus] = useState('');
  const [interviewOpen, setInterviewOpen] = useState(false);
  const [pendingSkill, setPendingSkill] = useState('');

  const loadSavedRoadmaps = async () => {
    if (!user) {
      setSavedRoadmaps([]);
      return;
    }

    const roadmaps = await getUserPersonalizedLearningPlans(user.uid);
    setSavedRoadmaps(roadmaps);
  };

  useEffect(() => {
    loadSavedRoadmaps();
  }, [user]);

  const trendingSkills = useMemo(() => skillCards.slice(0, 4), []);

  const canSubmit = searchQuery.trim().length > 0 && !loading;

  const generateRoadmapForSkill = async (skill, interviewAnswers = null) => {
    const topic = skill.trim();
    if (!topic) return;

    setSearchQuery(topic);
    setActiveSkill(topic);
    setLoading(true);
    setErrorMessage('');
    setSavedStatus('');
    setLearningPlan(null);

    try {
      const plan = buildPersonalizedLearningPlan({
        interviewAnswers: {
          ...(interviewAnswers || {}),
          learnTopic: interviewAnswers?.learnTopic || topic
        },
        sourceContext: 'academy',
        sourceLabel: topic,
        skillHint: topic
      });
      setLearningPlan(plan);
      if (user) {
        const saved = await savePersonalizedLearningPlan(user.uid, plan, 'academy');
        if (saved?.ok) {
          setSavedStatus('Personalized plan saved to Firebase.');
          await loadSavedRoadmaps();
        }
      }
    } catch (error) {
      console.error('Quick skill generation error:', error);
      setErrorMessage('The personalized learning engine could not generate your plan right now. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const openInterviewForSkill = (skill) => {
    const topic = skill.trim();
    if (!topic) {
      setErrorMessage('Please enter a skill or topic to generate a roadmap.');
      return;
    }
    setPendingSkill(topic);
    setInterviewOpen(true);
    setErrorMessage('');
  };

  const handleGenerate = async (event) => {
    event.preventDefault();
    openInterviewForSkill(searchQuery);
  };

  const handleQuickGenerate = async (skill) => {
    openInterviewForSkill(skill);
  };

  const handleSaveCurrent = async () => {
    if (!learningPlan || !user) return;
    const saved = await savePersonalizedLearningPlan(user.uid, learningPlan, 'academy');
    if (saved?.ok) {
      setSavedStatus('Current personalized plan saved to Firebase.');
      await loadSavedRoadmaps();
    } else {
      setSavedStatus('Could not save the current personalized plan.');
    }
  };

  const handleDelete = async (roadmapId) => {
    if (!user) return;
    const deleted = await deletePersonalizedLearningPlan(user.uid, roadmapId);
    if (deleted) {
      setSavedStatus('Personalized plan deleted.');
      await loadSavedRoadmaps();
    }
  };

  const handleRegenerate = async () => {
    if (!learningPlan?.topic) return;
    openInterviewForSkill(learningPlan.topic);
  };

  const handleLoad = (item) => {
    setLearningPlan({ id: item.id, ...item });
    setActiveSkill(item.topic || item.analytics?.skill || 'Skill');
    setSavedStatus('Loaded from Firebase.');
    setErrorMessage('');
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-950 text-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
        <SkillHeader title="Professional Skill Academy" subtitle="Generate world-class roadmaps for any skill, from absolute beginner to expert-level mastery, then save and revisit them whenever you need to grow." />

        <form onSubmit={handleGenerate} className="mx-auto flex w-full max-w-4xl flex-col gap-3 rounded-[2rem] border border-slate-800/70 bg-slate-900/70 p-3 shadow-2xl shadow-slate-950/40 backdrop-blur-xl sm:flex-row">
          <div className="flex flex-1 items-center gap-3 rounded-[1.4rem] border border-slate-800 bg-slate-950/70 px-4 py-3">
            <Search className="h-5 w-5 text-indigo-400" />
            <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Try Python, React, AI, Trading, Graphic Design..." className="w-full bg-transparent text-white outline-none placeholder:text-slate-500" />
          </div>
          <button type="submit" disabled={!canSubmit} className="inline-flex items-center justify-center gap-2 rounded-[1.4rem] bg-gradient-to-r from-indigo-500 to-cyan-500 px-5 py-3 font-semibold text-white transition hover:scale-[1.01] disabled:opacity-60">
            {loading ? <Loader className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {loading ? 'Generating...' : 'Start AI Interview'}
          </button>
        </form>

        {errorMessage && <div className="rounded-[1.6rem] border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">{errorMessage}</div>}
        {savedStatus && <div className="rounded-[1.6rem] border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-300">{savedStatus}</div>}

        <SkillSection title="Trending Skills" description="Tap any skill to generate a polished plan and start building momentum immediately.">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {skillCards.map((card) => (
              <SkillCard key={card.title} icon={card.icon} title={card.title} description={card.description} onClick={() => handleQuickGenerate(card.title)} active={activeSkill === card.title} />
            ))}
          </div>
        </SkillSection>

        {loading && <LoadingAcademy />}

        {learningPlan && !loading && (
          <div className="space-y-6">
            <SkillSection title={`${learningPlan.topic} Personalized Plan`} description="Interview-first personalized learning journey with adaptive dependencies, milestones, and career outcomes.">
              <div className="mt-6 flex flex-wrap gap-3">
                <button onClick={handleSaveCurrent} className="inline-flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-2 text-sm text-slate-200 hover:border-indigo-500"> <Save className="h-4 w-4" /> Save Plan</button>
                <button onClick={handleRegenerate} className="inline-flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-2 text-sm text-slate-200 hover:border-indigo-500"> <RotateCcw className="h-4 w-4" /> Regenerate</button>
                <button onClick={() => navigator.clipboard?.writeText(JSON.stringify(learningPlan, null, 2))} className="inline-flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-2 text-sm text-slate-200 hover:border-indigo-500"> <Copy className="h-4 w-4" /> Copy JSON</button>
              </div>
            </SkillSection>

            <PersonalizedLearningDashboard
              plan={learningPlan}
              onResume={() => {
                setSavedStatus('Resume mode activated. Continue with the next upcoming lesson.');
              }}
            />
          </div>
        )}

        <SkillSection title="Saved Personalized Plans" description="Your interview-first plans stored in Firebase.">
          {savedRoadmaps.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {savedRoadmaps.map((item) => (
                <div key={item.id} className="rounded-[1.6rem] border border-slate-800 bg-slate-950/70 p-5">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <h4 className="font-semibold text-white">{item.topic || item.analytics?.skill || 'Learning Plan'}</h4>
                      <p className="text-sm text-slate-400">Saved personalized plan</p>
                    </div>
                    <BadgeCheck className="h-5 w-5 text-indigo-400" />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button onClick={() => handleLoad(item)} className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 hover:border-indigo-500">Load</button>
                    <button onClick={() => handleDelete(item.id)} className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 hover:border-red-500">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400">No saved personalized plans yet. Start an AI interview to generate your first adaptive journey.</p>
          )}
        </SkillSection>
      </div>

      <LearningInterviewModal
        isOpen={interviewOpen}
        userId={user?.uid}
        sourceContext="roadmap"
        sourceLabel={pendingSkill}
        initialTopic={pendingSkill}
        onClose={() => setInterviewOpen(false)}
        onComplete={async (interviewAnswers) => {
          setInterviewOpen(false);
          const topic = (interviewAnswers?.learnTopic || pendingSkill || searchQuery).trim();
          await generateRoadmapForSkill(topic, interviewAnswers);
        }}
      />
    </div>
  );
}
