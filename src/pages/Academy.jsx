import { useState, useEffect } from 'react';
import { Search, Loader, BookOpen, Brain, GraduationCap, Briefcase, PenTool, HelpCircle, Layers, StickyNote, FileText, Network, Save, CheckCircle, Code, Music, HeartPulse, Wrench, Camera, ArrowRight } from 'lucide-react';
import { generateLessonSuite, getLearningPath } from '../services/aiService';
import { saveLessonSuite, getUserLessonSuites, saveRoadmap, getUserRoadmaps } from '../services/firestoreService';
import { useAuth } from '../context/AuthContext';
import LessonCard from '../components/lessons/LessonCard';
import QuizCard from '../components/lessons/QuizCard';
import FlashcardCard from '../components/lessons/FlashcardCard';
import RoadmapCard from '../components/lessons/RoadmapCard';

const skills = [
  { icon: Code, title: 'Programming', desc: 'Python, JavaScript, AI, Machine Learning, Web Dev' },
  { icon: Music, title: 'Music & Arts', desc: 'Guitar, Piano, Singing, Painting, Music Production' },
  { icon: HeartPulse, title: 'Medical', desc: 'Anatomy, Surgery, Diagnostics, Medicine' },
  { icon: Brain, title: 'Science', desc: 'Quantum Physics, Biology, Chemistry, Mathematics' },
  { icon: Wrench, title: 'Engineering', desc: 'Mechanical, Civil, Electrical, Car Repair' },
  { icon: Camera, title: 'Creativity', desc: 'Photography, Video Editing, Graphic Design' },
];

export default function Academy() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [suite, setSuite] = useState(null);
  const [loading, setLoading] = useState(false);
  const [savedSuites, setSavedSuites] = useState([]);
  const [savedRoadmaps, setSavedRoadmaps] = useState([]);
  const [selectedSkill, setSelectedSkill] = useState(null);
  const [roadmap, setRoadmap] = useState('');
  const [isSuiteSaved, setIsSuiteSaved] = useState(false);
  const [isRoadmapSaved, setIsRoadmapSaved] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (user) {
      getUserLessonSuites(user.uid).then(setSavedSuites);
      getUserRoadmaps(user.uid).then(setSavedRoadmaps);
    }
  }, [user]);

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim() || loading) return;

    setLoading(true);
    setSuite(null);
    setIsSuiteSaved(false);
    setErrorMessage('');

    const generatedSuite = await generateLessonSuite(searchQuery);
    setLoading(false);

    if (!generatedSuite) {
      setErrorMessage('Could not generate course. The AI response was invalid.');
      return;
    }

    setSuite(generatedSuite);

    if (user) {
      const saved = await saveLessonSuite(user.uid, searchQuery, generatedSuite);
      if (saved) {
        setIsSuiteSaved(true);
        const updatedSuites = await getUserLessonSuites(user.uid);
        setSavedSuites(updatedSuites);
      }
    }
  };

  const handleSkillClick = async (skillTitle) => {
    setSelectedSkill(skillTitle);
    setLoading(true);
    setRoadmap('');
    setIsRoadmapSaved(false);
    setErrorMessage('');

    const path = await getLearningPath(skillTitle);
    setRoadmap(path);
    setLoading(false);

    if (user) {
      const saved = await saveRoadmap(user.uid, skillTitle, path);
      if (saved) {
        setIsRoadmapSaved(true);
        const updatedRoadmaps = await getUserRoadmaps(user.uid);
        setSavedRoadmaps(updatedRoadmaps);
      }
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-950 text-white px-8 py-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Universal Knowledge Engine</h1>
      <p className="text-slate-400 mb-8">Type any topic to instantly generate a complete course, quizzes, flashcards, and more.</p>

      <form onSubmit={handleGenerate} className="mb-12 flex gap-2">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search a topic to generate a lesson suite"
          className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
          disabled={loading}
        />
        <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 px-6 py-3 rounded-lg font-medium flex items-center gap-2 transition-colors disabled:opacity-50" disabled={loading}>
          {loading ? <Loader className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
          Generate Course
        </button>
      </form>

      {errorMessage && (
        <div className="mb-8 rounded-2xl border border-red-600 bg-red-600/10 p-5 text-red-200">
          {errorMessage}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        {skills.map((skill, index) => (
          <div
            key={index}
            onClick={() => handleSkillClick(skill.title)}
            className={`bg-slate-900 p-8 rounded-2xl border transition-all cursor-pointer group ${selectedSkill === skill.title ? 'border-indigo-500' : 'border-slate-800 hover:border-indigo-500'}`}
          >
            <div className="flex items-center justify-between mb-4">
              <skill.icon className="w-10 h-10 text-indigo-500" />
              <ArrowRight className="w-6 h-6 text-slate-600 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="text-xl font-bold mb-2">{skill.title}</h3>
            <p className="text-slate-400">{skill.desc}</p>
          </div>
        ))}
      </div>

      {loading && !suite && (
        <div className="text-center py-20">
          <Loader className="w-10 h-10 animate-spin text-indigo-500 mx-auto mb-4" />
          <p className="text-slate-400">Daksha AI is generating your course or roadmap. This may take a moment.</p>
        </div>
      )}

      {suite && (
        <div className="space-y-6 mb-12">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <BookOpen className="w-6 h-6 text-indigo-500" /> {suite.course_title || searchQuery}
            </h2>
            {isSuiteSaved && (
              <span className="flex items-center gap-2 text-sm text-green-400 bg-green-400/10 px-3 py-1 rounded-full">
                <CheckCircle className="w-4 h-4" /> Saved to Profile
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <LessonCard icon={GraduationCap} title="Beginner" content={suite.beginner} />
            <LessonCard icon={Brain} title="Intermediate" content={suite.intermediate} />
            <LessonCard icon={Layers} title="Advanced" content={suite.advanced} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ListCard icon={Briefcase} title="Real-World Examples" items={suite.examples} />
            <ListCard icon={HelpCircle} title="Interview Questions" items={suite.interview_questions} />
            <ListCard icon={PenTool} title="Practice Questions" items={suite.practice_questions} />
            <RoadmapCard roadmap={suite.roadmap} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FlashcardCard flashcards={suite.flashcards} />
            <QuizCard quiz={suite.quiz} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <LessonCard icon={FileText} title="Revision Notes" content={suite.revision_notes} />
            <LessonCard icon={StickyNote} title="Cheat Sheet" content={suite.cheat_sheet} />
          </div>

          <LessonCard icon={Network} title="Mind Map (Text Representation)" content={suite.mind_map} />
        </div>
      )}

      {selectedSkill && (
        <div className="mt-12 bg-slate-900 p-8 rounded-2xl border border-slate-800 mb-12">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-bold flex items-center gap-3">
              <BookOpen className="w-6 h-6 text-indigo-500" /> Pathway: {selectedSkill}
            </h3>
            {isRoadmapSaved && (
              <span className="flex items-center gap-2 text-sm text-green-400 bg-green-400/10 px-3 py-1 rounded-full">
                <CheckCircle className="w-4 h-4" /> Saved to Profile
              </span>
            )}
          </div>
          {loading ? (
            <div className="flex items-center gap-3 text-indigo-400 animate-pulse">
              <Loader className="w-5 h-5 animate-spin" />
              <span>Daksha AI is designing your personalized roadmap...</span>
            </div>
          ) : (
            <div className="text-slate-300 whitespace-pre-wrap leading-relaxed font-mono text-sm bg-slate-950 p-6 rounded-xl border border-slate-800">
              {roadmap}
            </div>
          )}
        </div>
      )}

      {!loading && savedSuites.length > 0 && (
        <div className="mt-12">
          <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
            <Save className="w-6 h-6 text-indigo-500" /> Your Generated Courses
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {savedSuites.map((item) => (
              <div key={item.id} className="bg-slate-900 p-6 rounded-2xl border border-slate-800 hover:border-indigo-500 transition-all cursor-pointer" onClick={() => { setSuite(item.suite); setSearchQuery(item.topic); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
                <h4 className="text-xl font-bold mb-2 text-indigo-400">{item.topic}</h4>
                <p className="text-slate-400 text-sm">Click to view full course suite</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && savedRoadmaps.length > 0 && (
        <div className="mt-12">
          <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
            <Save className="w-6 h-6 text-indigo-500" /> Your Saved Roadmaps
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {savedRoadmaps.map((item) => (
              <div key={item.id} className="bg-slate-900 p-6 rounded-2xl border border-slate-800 hover:border-indigo-500 transition-all cursor-pointer" onClick={() => { setSelectedSkill(item.skill); setRoadmap(item.roadmap); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
                <h4 className="text-xl font-bold mb-2 text-indigo-400">{item.skill}</h4>
                <p className="text-slate-400 text-sm truncate">{item.roadmap.substring(0, 100)}...</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ListCard({ icon: Icon, title, items }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
      <h3 className="text-xl font-bold mb-3 flex items-center gap-2"><Icon className="w-5 h-5 text-indigo-500" /> {title}</h3>
      <ul className="space-y-2 text-slate-300 text-sm list-disc list-inside">
        {items.map((item, i) => <li key={i}>{item}</li>)}
      </ul>
    </div>
  );
}
