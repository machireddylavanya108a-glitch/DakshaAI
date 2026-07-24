import { useState, useEffect } from 'react';
import { Code, Music, HeartPulse, Brain, Wrench, Camera, ArrowRight, Loader, BookOpen, Sparkles, Save, CheckCircle } from 'lucide-react';
import { getLearningPath } from '../services/aiService';
import { saveRoadmap, getUserRoadmaps } from '../services/firestoreService';
import { useAuth } from '../context/AuthContext';

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
  const [selectedSkill, setSelectedSkill] = useState(null);
  const [roadmap, setRoadmap] = useState('');
  const [loading, setLoading] = useState(false);
  const [savedRoadmaps, setSavedRoadmaps] = useState([]);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (user) {
      getUserRoadmaps(user.uid).then(setSavedRoadmaps);
    }
  }, [user]);

  const handleSkillClick = async (skillTitle) => {
    setSelectedSkill(skillTitle);
    setLoading(true);
    setRoadmap("");
    setIsSaved(false);
    const path = await getLearningPath(skillTitle);
    setRoadmap(path);
    setLoading(false);
    
    if (user) {
      const saved = await saveRoadmap(user.uid, skillTitle, path);
      if (saved) {
        setIsSaved(true);
        const updatedRoadmaps = await getUserRoadmaps(user.uid);
        setSavedRoadmaps(updatedRoadmaps);
      }
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-950 text-white px-8 py-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Skill Academy</h1>
      <p className="text-slate-400 mb-8">Choose a skill. Daksha AI will generate and save a personalized course roadmap to your account.</p>

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

      {selectedSkill && (
        <div className="mt-12 bg-slate-900 p-8 rounded-2xl border border-slate-800 mb-12">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-2xl font-bold flex items-center gap-3">
              <BookOpen className="w-6 h-6 text-indigo-500" /> Pathway: {selectedSkill}
            </h3>
            {isSaved && (
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

      {savedRoadmaps.length > 0 && (
        <div className="mt-12">
          <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
            <Save className="w-6 h-6 text-indigo-500" /> Your Saved Roadmaps
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {savedRoadmaps.map((item) => (
              <div key={item.id} className="bg-slate-900 p-6 rounded-2xl border border-slate-800 hover:border-indigo-500 transition-all cursor-pointer" onClick={() => { setSelectedSkill(item.skill); setRoadmap(item.roadmap); setIsSaved(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
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
