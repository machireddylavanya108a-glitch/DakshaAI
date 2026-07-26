import { useEffect, useMemo, useState } from 'react';
import { addDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { Sparkles, Search, BrainCircuit, Trophy, Zap, Target, BookOpen, PenTool, Code2, Calculator, MessageSquare, History } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase/firebaseConfig';
import { adaptDifficulty, buildAnalytics, buildPracticeSet } from '../utils/practiceUtils';
import PracticeHome from '../components/practice/PracticeHome';
import PracticeSession from '../components/practice/PracticeSession';
import ProgressTracker from '../components/practice/ProgressTracker';
import WeakConcepts from '../components/practice/WeakConcepts';
import AIHints from '../components/practice/AIHints';
import PracticeHistory from '../components/practice/PracticeHistory';
import LoadingPractice from '../components/practice/LoadingPractice';

export default function PracticeMode() {
  const { user } = useAuth();
  const [topic, setTopic] = useState('Python Basics');
  const [difficulty, setDifficulty] = useState('Beginner');
  const [practiceSet, setPracticeSet] = useState(() => buildPracticeSet('Python Basics', 'Beginner'));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [history, setHistory] = useState([]);
  const [analytics, setAnalytics] = useState({ accuracy: 0, averageTime: 0, completion: 0, weakTopics: [], strongTopics: [], dailyProgress: 0, weeklyProgress: 0, monthlyProgress: 0 });

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const loadHistory = async () => {
      if (!user?.uid) return;
      try {
        const q = query(collection(db, 'practiceSessions'), where('userId', '==', user.uid));
        const snapshot = await getDocs(q);
        const entries = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setHistory(entries);
        setAnalytics(buildAnalytics(entries));
      } catch (error) {
        console.error('Unable to load practice sessions:', error);
        setOffline(true);
      }
    };

    loadHistory();
  }, [user?.uid]);

  const currentQuestion = practiceSet.questions[currentIndex];
  const progressPercent = useMemo(() => Math.round(((currentIndex + 1) / Math.max(practiceSet.questions.length, 1)) * 100), [currentIndex, practiceSet.questions.length]);

  const startSession = () => {
    const nextSet = buildPracticeSet(topic || 'Practice Topic', difficulty);
    setPracticeSet(nextSet);
    setCurrentIndex(0);
    setAnswers([]);
    setScore(0);
  };

  const handleSubmitAnswer = (answer) => {
    const nextAnswer = { questionId: currentQuestion.id, answer, correct: answer === currentQuestion.answer };
    const nextAnswers = [...answers, nextAnswer];
    setAnswers(nextAnswers);
    setScore((value) => value + (answer === currentQuestion.answer ? 1 : 0));
    if (currentIndex < practiceSet.questions.length - 1) {
      setCurrentIndex((value) => value + 1);
    }
  };

  const finishSession = async () => {
    const accuracy = Math.round((score / Math.max(practiceSet.questions.length, 1)) * 100);
    const nextDifficulty = adaptDifficulty(accuracy, 2, history);
    const feedback = accuracy >= 80 ? 'Strong performance. Keep practicing.' : 'Review explanations and try again.';

    if (user?.uid) {
      try {
        await addDoc(collection(db, 'practiceSessions'), {
          userId: user.uid,
          topic,
          difficulty: nextDifficulty,
          questions: practiceSet.questions,
          answers,
          score: accuracy,
          accuracy,
          duration: 12,
          feedback,
          createdAt: new Date()
        });
        const q = query(collection(db, 'practiceSessions'), where('userId', '==', user.uid));
        const snapshot = await getDocs(q);
        const entries = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setHistory(entries);
        setAnalytics(buildAnalytics(entries));
      } catch (error) {
        console.error('Unable to save practice session:', error);
        setOffline(true);
      }
    }
  };

  if (loading) return <LoadingPractice />;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.16),_transparent_35%),linear-gradient(135deg,_#020617_0%,_#0f172a_45%,_#111827_100%)] px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <div className="rounded-[2rem] border border-white/10 bg-slate-900/75 p-6 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-cyan-300">Universal AI Practice Engine</p>
              <h1 className="mt-2 text-3xl font-semibold text-white sm:text-4xl">Practice any subject, skill, exam, or interview scenario</h1>
              <p className="mt-3 max-w-2xl text-sm text-slate-400 sm:text-base">Generate adaptive practice questions dynamically, evaluate responses instantly, and track your improvement over time.</p>
            </div>
            <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100">
              <div className="flex items-center gap-2"><Sparkles className="h-4 w-4" /> Adaptive practice mode</div>
            </div>
          </div>
        </div>

        {offline ? <div className="rounded-[1.5rem] border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-300">Offline mode active. Your practice engine remains ready for local learning.</div> : null}

        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <div className="rounded-[2rem] border border-white/10 bg-slate-900/75 p-4 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
              <PracticeHome topic={topic} difficulty={difficulty} onTopicChange={setTopic} onDifficultyChange={setDifficulty} onStart={startSession} />
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-slate-900/75 p-4 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
              <PracticeSession question={currentQuestion} onSubmit={handleSubmitAnswer} />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div className="rounded-[2rem] border border-white/10 bg-slate-900/75 p-4 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
                <ProgressTracker progress={progressPercent} score={score} questionCount={practiceSet.questions.length} />
              </div>
              <div className="rounded-[2rem] border border-white/10 bg-slate-900/75 p-4 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
                <WeakConcepts analytics={analytics} />
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[2rem] border border-white/10 bg-slate-900/75 p-5 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
              <AIHints practiceSet={practiceSet} />
            </div>
            <div className="rounded-[2rem] border border-white/10 bg-slate-900/75 p-5 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
              <PracticeHistory history={history} />
            </div>
            <div className="rounded-[2rem] border border-white/10 bg-slate-900/75 p-5 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
              <div className="flex items-center gap-2 text-cyan-300"><Trophy className="h-4 w-4" /> Achievements</div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {['Daily Streak', 'Perfect Score', 'Fast Learner', 'Expert Level'].map((item) => <div key={item} className="rounded-[1rem] border border-white/10 bg-slate-950/70 p-3 text-sm text-slate-300">{item}</div>)}
              </div>
            </div>
            <div className="rounded-[2rem] border border-white/10 bg-slate-900/75 p-5 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
              <div className="flex items-center gap-2 text-cyan-300"><BrainCircuit className="h-4 w-4" /> Analytics</div>
              <div className="mt-4 space-y-2 text-sm text-slate-400">
                <div className="rounded-[1rem] border border-white/10 bg-slate-950/70 p-3">Accuracy: {analytics.accuracy}%</div>
                <div className="rounded-[1rem] border border-white/10 bg-slate-950/70 p-3">Average Time: {analytics.averageTime}m</div>
                <div className="rounded-[1rem] border border-white/10 bg-slate-950/70 p-3">Completion: {analytics.completion}%</div>
              </div>
            </div>
            <div className="rounded-[2rem] border border-white/10 bg-slate-900/75 p-5 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
              <div className="flex items-center gap-2 text-cyan-300"><Target className="h-4 w-4" /> Continue Practice</div>
              <button onClick={finishSession} className="mt-4 rounded-full bg-cyan-500 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-400">Save Session</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
