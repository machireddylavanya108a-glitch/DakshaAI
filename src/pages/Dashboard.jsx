import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Scan, BookOpen, MessageSquare, LogOut, Sparkles, CheckCircle2, Trophy, FileText, TrendingUp } from 'lucide-react';
import { getUserLessonSuites, getUserExerciseProgress, getUserQuizScores, getUserDocumentAnalyses } from '../services/firestoreService';
import { summarizeDashboardStats } from '../utils/dashboardUtils';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ completedLessons: 0, savedCourses: 0, quizScores: 0, learningProgress: 0, recentDocuments: [] });
  const [loading, setLoading] = useState(true);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  useEffect(() => {
    const loadDashboardData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      const [lessonSuites, exerciseProgress, quizScores, documentAnalyses] = await Promise.all([
        getUserLessonSuites(user.uid),
        getUserExerciseProgress(user.uid),
        getUserQuizScores(user.uid),
        getUserDocumentAnalyses(user.uid)
      ]);

      setStats(summarizeDashboardStats({ lessonSuites, exerciseProgress, quizScores, documentAnalyses }));
      setLoading(false);
    };

    loadDashboardData();
  }, [user]);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-950 text-white px-8 py-8 max-w-7xl mx-auto">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between mb-12">
        <div>
          <h1 className="text-4xl font-bold">Welcome, {user?.displayName || 'Learner'}</h1>
          <p className="text-slate-400 mt-2">What do you want to explore in Daksha AI today?</p>
        </div>
        <button
          onClick={handleLogout}
          className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 border border-slate-700 px-5 py-3 text-slate-200 hover:bg-slate-800 transition-colors"
        >
          <LogOut className="w-4 h-4" /> Logout
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            <span className="text-2xl font-semibold text-white">{stats.completedLessons}</span>
          </div>
          <h3 className="text-lg font-semibold">Completed lessons</h3>
          <p className="text-sm text-slate-400 mt-1">Exercises and learning tracks you have completed.</p>
        </div>
        <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <BookOpen className="w-8 h-8 text-indigo-400" />
            <span className="text-2xl font-semibold text-white">{stats.savedCourses}</span>
          </div>
          <h3 className="text-lg font-semibold">Saved courses</h3>
          <p className="text-sm text-slate-400 mt-1">Academy lessons and course suites you saved.</p>
        </div>
        <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <Trophy className="w-8 h-8 text-amber-400" />
            <span className="text-2xl font-semibold text-white">{stats.quizScores}</span>
          </div>
          <h3 className="text-lg font-semibold">Quiz scores</h3>
          <p className="text-sm text-slate-400 mt-1">Practice attempts and results tracked in Firestore.</p>
        </div>
        <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <TrendingUp className="w-8 h-8 text-cyan-400" />
            <span className="text-2xl font-semibold text-white">{stats.learningProgress}%</span>
          </div>
          <h3 className="text-lg font-semibold">Learning progress</h3>
          <p className="text-sm text-slate-400 mt-1">Completion rate across your practical exercises.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-6">
        <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800">
          <div className="flex items-center gap-3 mb-6">
            <Sparkles className="w-6 h-6 text-indigo-400" />
            <h2 className="text-2xl font-semibold">Your learning dashboard</h2>
          </div>
          {loading ? (
            <p className="text-slate-400">Loading your learning data…</p>
          ) : (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                <p className="text-sm text-slate-400">Recent documents</p>
                {stats.recentDocuments.length > 0 ? (
                  <ul className="mt-3 space-y-2">
                    {stats.recentDocuments.map((entry, index) => (
                      <li key={`${entry.fileName}-${index}`} className="flex items-center gap-2 text-slate-200">
                        <FileText className="w-4 h-4 text-indigo-400" />
                        <span>{entry.fileName}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-slate-500">No documents have been saved yet.</p>
                )}
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
                <p className="text-sm text-slate-400">Next recommended action</p>
                <p className="mt-2 text-slate-200">Open Scanner to turn a new document into a lesson, then continue in Academy to practice and track progress.</p>
              </div>
            </div>
          )}
        </div>

        <div className="grid gap-4">
          <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 hover:border-indigo-500 transition-colors cursor-pointer" onClick={() => navigate('/scanner')}>
            <Scan className="w-10 h-10 text-indigo-500 mb-4" />
            <h3 className="text-xl font-bold mb-2">Universal Scanner</h3>
            <p className="text-slate-400">Upload images, diagrams, or notes and get instant AI explanations.</p>
          </div>
          <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 hover:border-indigo-500 transition-colors cursor-pointer" onClick={() => navigate('/academy')}>
            <BookOpen className="w-10 h-10 text-indigo-500 mb-4" />
            <h3 className="text-xl font-bold mb-2">Skill Academy</h3>
            <p className="text-slate-400">Generate learning roadmaps for new skills and save progress.</p>
          </div>
          <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 hover:border-indigo-500 transition-colors cursor-pointer" onClick={() => navigate('/chat')}>
            <MessageSquare className="w-10 h-10 text-indigo-500 mb-4" />
            <h3 className="text-xl font-bold mb-2">AI Teacher</h3>
            <p className="text-slate-400">Ask Daksha questions and get guided answers, talk, or listen.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
