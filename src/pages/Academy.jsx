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
import Interactive3DLessonRuntime from '../components/academy/Interactive3DLessonRuntime';
import { buildPersonalizedLearningPlan } from '../utils/personalizedLearningEngine';
import { buildSkillAcademyMentorPlan } from '../utils/skillAcademyMentorEngine';
import { buildKnowledgeGraph } from '../utils/knowledgeGraphEngine';
import { buildAdaptiveInterviewQuestions } from '../utils/learningInterviewUtils';
import { shouldRenderInterviewModal, toTopicId } from '../utils/interviewPersistence';

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
  const flowType = 'skill-first';
  const interviewDecision = 'ADAPTIVE_INTERVIEW';
  const pendingTopicId = toTopicId(pendingSkill || searchQuery || activeSkill);
  const interviewQuestions = useMemo(() => buildAdaptiveInterviewQuestions(pendingSkill || searchQuery || activeSkill, {}, {
    mode: 'skill',
    sourceContext: 'roadmap',
    sourceLabel: pendingSkill || searchQuery || activeSkill
  }), [pendingSkill, searchQuery, activeSkill]);
  const shouldShowInterviewModal = interviewOpen && shouldRenderInterviewModal({
    flowType,
    interviewDecision,
    questions: interviewQuestions
  });

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
      const personalized = buildPersonalizedLearningPlan({
        interviewAnswers: {
          ...(interviewAnswers || {}),
          learnTopic: interviewAnswers?.learnTopic || topic
        },
        sourceContext: 'academy',
        sourceLabel: topic,
        skillHint: topic
      });
      const mentorPlan = buildSkillAcademyMentorPlan({
        skill: topic,
        interviewAnswers: {
          ...(interviewAnswers || {}),
          learnTopic: interviewAnswers?.learnTopic || topic
        }
      });
      const knowledgeGraph = buildKnowledgeGraph({
        topic,
        prereqs: mentorPlan.mentor?.roadmap?.slice(0, 3) || [],
        relatedTopics: mentorPlan.mentor?.projects?.slice(0, 3) || [],
        advancedTopics: mentorPlan.mentor?.careerRoadmap?.slice(0, 3) || [],
        similarTopics: mentorPlan.mentor?.freelancingRoadmap?.slice(0, 3) || [],
        revisions: mentorPlan.mentor?.portfolio?.slice(0, 3) || []
      });
      const plan = {
        ...personalized,
        mentor: mentorPlan.mentor,
        mentorProfile: {
          topic: mentorPlan.topic,
          level: mentorPlan.level,
          goal: mentorPlan.goal,
          language: mentorPlan.language,
          speed: mentorPlan.speed,
          interviewSummary: mentorPlan.mentor.interviewSummary
        },
        knowledgeGraph
      };
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
    if (!roadmapId) {
      setSavedStatus('This plan cannot be deleted because its id is missing.');
      return;
    }
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
    if (!item) {
      setErrorMessage('Unable to load this plan.');
      return;
    }

    const safeTopic = item.topic || item.analytics?.skill || 'Topic not detected yet';
    setLearningPlan({ id: item.id || item.planId || '', ...item, topic: safeTopic });
    setActiveSkill(safeTopic);
    setSavedStatus('Loaded from Firebase.');
    setErrorMessage('');
  };

  const openFull3DStudio = () => {
    if (!learningPlan?.topic) return;
    const params = new URLSearchParams({
      topic: learningPlan.topic,
      content: learningPlan?.mentor?.aiTeacherPlan || learningPlan?.mentorProfile?.interviewSummary || learningPlan.topic,
      sourceType: 'ai-teacher-lesson'
    });
    navigate(`/3d-learning?${params.toString()}`);
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

            <div className="grid gap-6 xl:grid-cols-2">
              <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/40">
                <p className="text-xs uppercase tracking-[0.3em] text-cyan-300">AI Mentor Profile</p>
                <h3 className="mt-2 text-xl font-semibold text-white">Personalized learning mentor</h3>
                <div className="mt-4 space-y-3 text-sm text-slate-300">
                  <p><span className="text-cyan-200">Level:</span> {learningPlan?.mentorProfile?.level}</p>
                  <p><span className="text-cyan-200">Goal:</span> {learningPlan?.mentorProfile?.goal}</p>
                  <p><span className="text-cyan-200">Language:</span> {learningPlan?.mentorProfile?.language}</p>
                  <p><span className="text-cyan-200">Pace:</span> {learningPlan?.mentorProfile?.speed}</p>
                  <p className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3 text-slate-400">{learningPlan?.mentorProfile?.interviewSummary}</p>
                </div>
              </div>

              <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/40">
                <p className="text-xs uppercase tracking-[0.3em] text-cyan-300">Mentor Modules</p>
                <div className="mt-4 space-y-2 text-sm text-slate-300">
                  {[
                    ['Roadmap', learningPlan?.mentor?.roadmap?.[0]],
                    ['Daily Schedule', learningPlan?.mentor?.dailySchedule?.[0]?.focus],
                    ['Projects', learningPlan?.mentor?.projects?.[0]],
                    ['Assessments', learningPlan?.mentor?.assessments?.[0]],
                    ['Portfolio', learningPlan?.mentor?.portfolio?.[0]],
                    ['Career Roadmap', learningPlan?.mentor?.careerRoadmap?.[0]]
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3">
                      <p className="text-cyan-200">{label}</p>
                      <p className="mt-1 text-slate-400">{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
              <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/40">
                <p className="text-xs uppercase tracking-[0.3em] text-cyan-300">Knowledge Graph Explorer</p>
                <div className="mt-4 space-y-3 text-sm text-slate-300">
                  <p><span className="text-cyan-200">Concept Graph:</span> {learningPlan?.knowledgeGraph?.conceptGraph?.join(' → ')}</p>
                  <p><span className="text-cyan-200">Skill Graph:</span> {learningPlan?.knowledgeGraph?.skillGraph?.join(' → ')}</p>
                  <p><span className="text-cyan-200">Relationship Graph:</span> {learningPlan?.knowledgeGraph?.relationshipGraph?.map((item) => `${item.from} → ${item.to} (${item.relation})`).join(' | ')}</p>
                  <p><span className="text-cyan-200">Prerequisites:</span> {learningPlan?.knowledgeGraph?.prerequisites?.join(', ')}</p>
                  <p><span className="text-cyan-200">Next Concepts:</span> {learningPlan?.knowledgeGraph?.nextConcepts?.join(', ')}</p>
                  <p><span className="text-cyan-200">Similar Topics:</span> {learningPlan?.knowledgeGraph?.similarTopics?.join(', ')}</p>
                  <p><span className="text-cyan-200">Advanced Topics:</span> {learningPlan?.knowledgeGraph?.advancedTopics?.join(', ')}</p>
                  <p><span className="text-cyan-200">Revision Graph:</span> {learningPlan?.knowledgeGraph?.revisionGraph?.join(', ')}</p>
                  <p><span className="text-cyan-200">Learning Tree:</span> {learningPlan?.knowledgeGraph?.learningTree?.join(' → ')}</p>
                  <p><span className="text-cyan-200">Dependency Graph:</span> {learningPlan?.knowledgeGraph?.dependencyGraph?.map((item) => `${item.from} → ${item.to}`).join(' | ')}</p>
                </div>
              </div>
              <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/40">
                <p className="text-xs uppercase tracking-[0.3em] text-cyan-300">AI Teacher Plan</p>
                <p className="mt-3 text-sm text-slate-300">{learningPlan?.mentor?.aiTeacherPlan}</p>
              </div>
            </div>

            <Interactive3DLessonRuntime
              topic={learningPlan?.topic}
              sourceContent={learningPlan?.mentor?.aiTeacherPlan || learningPlan?.mentorProfile?.interviewSummary || ''}
              sourceType="ai-teacher-lesson"
              userId={user?.uid}
              aiTeacherPlan={learningPlan?.mentor?.aiTeacherPlan || ''}
              onOpenStudio={openFull3DStudio}
            />
          </div>
        )}

        <SkillSection title="Saved Personalized Plans" description="Your interview-first plans stored in Firebase.">
          {savedRoadmaps.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {savedRoadmaps.map((item, index) => {
                const recordId = item.id || item.planId || '';
                return (
                <div key={recordId || `${item.topic || 'plan'}-${index}`} className="rounded-[1.6rem] border border-slate-800 bg-slate-950/70 p-5">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <h4 className="font-semibold text-white">{item.topic || item.analytics?.skill || 'Learning Plan'}</h4>
                      <p className="text-sm text-slate-400">Saved personalized plan</p>
                    </div>
                    <BadgeCheck className="h-5 w-5 text-indigo-400" />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button onClick={() => handleLoad(item)} className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 hover:border-indigo-500">Load</button>
                    <button onClick={() => handleDelete(recordId)} disabled={!recordId} className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 hover:border-red-500 disabled:cursor-not-allowed disabled:opacity-50">Delete</button>
                  </div>
                </div>
              )})}
            </div>
          ) : (
            <p className="text-sm text-slate-400">No saved personalized plans yet. Start an AI interview to generate your first adaptive journey.</p>
          )}
        </SkillSection>
      </div>

      {shouldShowInterviewModal ? (
        <LearningInterviewModal
          isOpen={true}
          flowType={flowType}
          interviewDecision={interviewDecision}
          topicId={pendingTopicId}
          questions={interviewQuestions}
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
      ) : null}
    </div>
  );
}
