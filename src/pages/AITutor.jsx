import { useEffect, useMemo, useState } from 'react';
import { addDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { BookOpen, BrainCircuit, Mic, Sparkles, Search, Trophy, MessageCircle, Bookmark, History, Brain, PenTool, ListChecks, Layers3 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase/firebaseConfig';
import { buildTutorDashboardData, buildTutorLesson } from '../utils/aiTutorUtils';
import TutorChat from '../components/aiTutor/TutorChat';
import TutorVoice from '../components/aiTutor/TutorVoice';
import TutorCanvas from '../components/aiTutor/TutorCanvas';
import TutorWhiteboard from '../components/aiTutor/TutorWhiteboard';
import TutorMemory from '../components/aiTutor/TutorMemory';
import TutorQuiz from '../components/aiTutor/TutorQuiz';
import TutorFlashcards from '../components/aiTutor/TutorFlashcards';
import TutorRoadmap from '../components/aiTutor/TutorRoadmap';
import TutorExamples from '../components/aiTutor/TutorExamples';
import TutorProgress from '../components/aiTutor/TutorProgress';
import TutorHistory from '../components/aiTutor/TutorHistory';
import TutorLoading from '../components/aiTutor/TutorLoading';

export default function AITutor() {
  const { user } = useAuth();
  const [topic, setTopic] = useState('JavaScript Basics');
  const [mode, setMode] = useState('Teach Me');
  const [lesson, setLesson] = useState(() => buildTutorLesson('JavaScript Basics', 'Teach Me'));
  const [messages, setMessages] = useState([{ role: 'assistant', content: 'I am your universal AI tutor. Tell me what you want to learn today.' }]);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [history, setHistory] = useState([]);
  const [dashboard, setDashboard] = useState({ recentTopics: [], continueLearning: [], recommendations: [], weakConcepts: [], achievements: [], learningTime: 0, completedLessons: 0, incompleteLessons: 0 });

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const loadHistory = async () => {
      if (!user?.uid) return;
      try {
        const q = query(collection(db, 'aiTutorHistory'), where('userId', '==', user.uid));
        const snapshot = await getDocs(q);
        const entries = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setHistory(entries);
        setDashboard(buildTutorDashboardData(entries));
      } catch (error) {
        console.error('Unable to load tutor history:', error);
        setOffline(true);
      }
    };

    loadHistory();
  }, [user?.uid]);

  const startLesson = () => {
    const nextLesson = buildTutorLesson(topic || 'Learning Topic', mode);
    setLesson(nextLesson);
    setMessages([{ role: 'assistant', content: `Starting a ${mode} lesson on ${topic}.` }]);
    setDashboard(buildTutorDashboardData(history));
  };

  const handleSendMessage = (content) => {
    setMessages((prev) => [...prev, { role: 'student', content }]);
    const nextLesson = buildTutorLesson(topic || 'Learning Topic', mode);
    const reply = `${content}\n\n${nextLesson.explanation}`;
    setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
  };

  const saveSession = async () => {
    if (!user?.uid) {
      setOffline(true);
      return;
    }

    try {
      await addDoc(collection(db, 'aiTutorHistory'), {
        userId: user.uid,
        topic,
        conversation: messages,
        lesson,
        quiz: lesson.quiz,
        progress: lesson.progress,
        createdAt: new Date()
      });
      const q = query(collection(db, 'aiTutorHistory'), where('userId', '==', user.uid));
      const snapshot = await getDocs(q);
      const entries = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setHistory(entries);
      setDashboard(buildTutorDashboardData(entries));
    } catch (error) {
      console.error('Unable to save tutor session:', error);
      setOffline(true);
    }
  };

  const modes = ['Teach Me', 'Explain Like I\'m 5', 'Beginner', 'Intermediate', 'Advanced', 'Expert', 'Research Mode', 'Revision Mode', 'Exam Mode', 'Interview Mode', 'Practice Mode'];

  if (loading) return <TutorLoading />;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(129,140,248,0.16),_transparent_35%),linear-gradient(135deg,_#020617_0%,_#0f172a_45%,_#111827_100%)] px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <div className="rounded-[2rem] border border-white/10 bg-slate-900/75 p-6 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-indigo-300">Universal AI Personal Tutor</p>
              <h1 className="mt-2 text-3xl font-semibold text-white sm:text-4xl">Learn anything with a calm, intelligent, always-available tutor</h1>
              <p className="mt-3 max-w-2xl text-sm text-slate-400 sm:text-base">Teach, explain, quiz, revise, and guide practice for any subject, skill, or profession using a premium, responsive learning workspace.</p>
            </div>
            <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/10 px-4 py-3 text-sm text-indigo-100">
              <div className="flex items-center gap-2"><Sparkles className="h-4 w-4" /> Always-on tutor</div>
            </div>
          </div>
        </div>

        {offline ? <div className="rounded-[1.5rem] border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-300">Offline mode active. Your tutor experience remains available with local guidance.</div> : null}

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <div className="rounded-[2rem] border border-white/10 bg-slate-900/75 p-4 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-2 text-indigo-300"><Search className="h-4 w-4" /> Choose any topic</div>
                <div className="flex flex-wrap gap-2">
                  <input value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="Try: Python, Medicine, Finance, Photography..." className="rounded-full border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-slate-200 outline-none" />
                  <select value={mode} onChange={(event) => setMode(event.target.value)} className="rounded-full border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-slate-200 outline-none">
                    {modes.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                  <button onClick={startLesson} className="rounded-full bg-indigo-500 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-indigo-400">Start Tutor</button>
                </div>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <TutorChat messages={messages} onSend={handleSendMessage} />
              <TutorVoice topic={topic} mode={mode} />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <TutorCanvas lesson={lesson} />
              <TutorWhiteboard lesson={lesson} />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <TutorExamples lesson={lesson} />
              <TutorRoadmap lesson={lesson} />
            </div>
          </div>

          <div className="space-y-6">
            <TutorMemory lesson={lesson} dashboard={dashboard} />
            <TutorQuiz lesson={lesson} />
            <TutorFlashcards lesson={lesson} />
            <TutorProgress lesson={lesson} />
            <TutorHistory history={history} />
            <div className="rounded-[2rem] border border-white/10 bg-slate-900/75 p-5 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
              <div className="flex items-center gap-2 text-indigo-300"><BookOpen className="h-4 w-4" /> Session tools</div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button onClick={saveSession} className="rounded-full border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-slate-200">Save Session</button>
                <button onClick={() => setMessages([{ role: 'assistant', content: 'I am your universal AI tutor. Tell me what you want to learn today.' }])} className="rounded-full border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-slate-200">Reset Chat</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
