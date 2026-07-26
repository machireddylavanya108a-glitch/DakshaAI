import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Scan, BookOpen, MessageSquare, LogOut, Sparkles, Trophy, FileText, TrendingUp, Clock3, Target, BrainCircuit, NotebookPen, Camera, Mic, Layers3, Zap, ArrowRight, RefreshCw } from 'lucide-react';
import { getUserLessonSuites, getUserExerciseProgress, getUserQuizScores, getUserDocumentAnalyses, getUserFlashcards, getUserMemoryProfile, saveDashboardStats } from '../services/firestoreService';
import { summarizeDashboardStats } from '../utils/dashboardUtils';
import DashboardCard from '../components/dashboard/DashboardCard';
import StatCard from '../components/dashboard/StatCard';
import ProgressChart from '../components/dashboard/ProgressChart';
import ActivityCard from '../components/dashboard/ActivityCard';
import AchievementCard from '../components/dashboard/AchievementCard';
import RecommendationCard from '../components/dashboard/RecommendationCard';
import LoadingDashboard from '../components/dashboard/LoadingDashboard';

const quickActions = [
  { label: 'Continue Learning', path: '/academy', icon: BookOpen },
  { label: 'Scan Document', path: '/scanner', icon: Scan },
  { label: 'Upload PDF', path: '/pdf-learning', icon: FileText },
  { label: 'Start Quiz', path: '/quiz', icon: NotebookPen },
  { label: 'Practice Mode', path: '/flashcards', icon: Layers3 },
  { label: 'AI Tutor', path: '/chat', icon: MessageSquare },
  { label: 'Flashcards', path: '/flashcards', icon: BrainCircuit },
  { label: 'Notes', path: '/memory-dashboard', icon: NotebookPen },
];

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    completedLessons: 0,
    savedCourses: 0,
    quizScores: 0,
    learningProgress: 0,
    studyHours: 0,
    lessons: 0,
    quizzes: 0,
    accuracy: 0,
    aiScore: 0,
    weeklyData: [],
    monthlyData: [],
    quizData: [],
    subjectDistribution: [],
    recentDocuments: [],
    flashcardsReviewed: 0,
    strongTopics: [],
    weakTopics: [],
    recommendations: [],
    achievements: [],
    recentActivity: [],
    upcomingTasks: [],
    savedCourseNames: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [offline, setOffline] = useState(false);

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
      if (!user?.uid) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');
      try {
        const [lessonSuites, exerciseProgress, quizScores, documentAnalyses, flashcards, memory] = await Promise.all([
          getUserLessonSuites(user.uid),
          getUserExerciseProgress(user.uid),
          getUserQuizScores(user.uid),
          getUserDocumentAnalyses(user.uid),
          getUserFlashcards(user.uid),
          getUserMemoryProfile(user.uid)
        ]);

        const nextStats = summarizeDashboardStats({ lessonSuites, exerciseProgress, quizScores, documentAnalyses, flashcards, memoryProfile: memory || {} });
        const enrichedStats = {
          ...nextStats,
          streak: Math.max(3, Math.round(nextStats.studyHours / 4))
        };
        setStats(enrichedStats);
        await saveDashboardStats(user.uid, enrichedStats);
        setOffline(false);
      } catch (err) {
        console.error('Dashboard load error:', err);
        setError('Unable to sync full dashboard data right now. Showing a resilient fallback view.');
        setOffline(true);
        setStats(summarizeDashboardStats({ lessonSuites: [], exerciseProgress: [], quizScores: [], documentAnalyses: [], flashcards: [], memoryProfile: {} }));
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [user?.uid]);

  const todayStudyTime = useMemo(() => `${stats.studyHours}h`, [stats.studyHours]);
  const weeklyStudyTime = useMemo(() => `${Math.max(8, stats.studyHours + 4)}h`, [stats.studyHours]);
  const monthlyStudyTime = useMemo(() => `${Math.max(20, stats.studyHours + 10)}h`, [stats.studyHours]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.16),_transparent_35%),linear-gradient(135deg,_#020617_0%,_#0f172a_45%,_#111827_100%)] px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <DashboardCard title="AI Learning Home" description="Your personalized command center for progress, focus, and next steps." accent="from-emerald-500/20 to-cyan-500/10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-emerald-300">Professional AI Dashboard</p>
              <h1 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">Welcome back, {user?.displayName || 'Learner'}</h1>
              <p className="mt-3 max-w-2xl text-sm text-slate-400 sm:text-base">Track your study rhythm, achievements, recommended actions, and remaining focus areas in one calm, intelligent workspace.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => navigate('/memory-dashboard')} className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-200">Open Memory</button>
              <button onClick={handleLogout} className="inline-flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-2 text-sm text-slate-200"><LogOut className="h-4 w-4" /> Logout</button>
            </div>
          </div>
        </DashboardCard>

        {error ? <div className="rounded-[1.5rem] border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">{error}</div> : null}
        {offline ? <div className="rounded-[1.5rem] border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-300">Offline mode active. Your dashboard remains available with a lightweight fallback.</div> : null}

        {loading ? <LoadingDashboard /> : (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Today's Study Time" value={todayStudyTime} hint="Focused learning time today" icon={Clock3} accent="text-emerald-300" />
              <StatCard label="Weekly Study Time" value={weeklyStudyTime} hint="Consistent momentum" icon={TrendingUp} accent="text-cyan-300" />
              <StatCard label="Monthly Study Time" value={monthlyStudyTime} hint="Progress over the month" icon={Target} accent="text-violet-300" />
              <StatCard label="AI Score" value={`${stats.aiScore}%`} hint="Personalized performance score" icon={Sparkles} accent="text-amber-300" />
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Total Lessons" value={stats.lessons} hint="Roadmaps and lessons engaged" icon={BookOpen} accent="text-indigo-300" />
              <StatCard label="Total Quizzes" value={stats.quizzes} hint="Practice attempts completed" icon={NotebookPen} accent="text-sky-300" />
              <StatCard label="Average Accuracy" value={`${stats.accuracy}%`} hint="Quiz reliability" icon={Trophy} accent="text-yellow-300" />
              <StatCard label="Flashcards Reviewed" value={stats.flashcardsReviewed} hint="Retention sessions" icon={BrainCircuit} accent="text-fuchsia-300" />
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <DashboardCard title="Learning Overview" description="Your weekly, monthly, and quiz performance landscape." accent="from-sky-500/20 to-indigo-500/10">
                <div className="grid gap-4 lg:grid-cols-2">
                  <ProgressChart data={stats.weeklyData} label="Weekly Learning Graph" />
                  <ProgressChart data={stats.monthlyData} label="Monthly Learning Graph" />
                  <ProgressChart data={stats.quizData} label="Quiz Performance Graph" />
                  <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/70 p-4">
                    <div className="mb-4 flex items-center justify-between">
                      <p className="text-sm text-slate-400">Subject Distribution</p>
                      <p className="text-sm text-emerald-300">Focus mix</p>
                    </div>
                    <div className="space-y-3">
                      {stats.subjectDistribution.map((item) => (
                        <div key={item.label}>
                          <div className="mb-1 flex items-center justify-between text-sm text-slate-300">
                            <span>{item.label}</span>
                            <span>{item.value}%</span>
                          </div>
                          <div className="h-2 rounded-full bg-slate-800">
                            <div className="h-2 rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400" style={{ width: `${item.value}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </DashboardCard>

              <DashboardCard title="Quick Actions" description="Jump into the next best step in your learning flow." accent="from-violet-500/20 to-fuchsia-500/10">
                <div className="grid gap-3 sm:grid-cols-2">
                  {quickActions.map((action) => {
                    const Icon = action.icon;
                    return (
                      <button key={action.label} onClick={() => navigate(action.path)} className="flex items-center justify-between rounded-[1.2rem] border border-white/10 bg-slate-950/70 px-4 py-3 text-left text-sm text-slate-200 transition hover:border-emerald-500/30 hover:bg-slate-800/80">
                        <span className="flex items-center gap-2"><Icon className="h-4 w-4 text-emerald-300" /> {action.label}</span>
                        <ArrowRight className="h-4 w-4 text-slate-500" />
                      </button>
                    );
                  })}
                </div>
              </DashboardCard>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <DashboardCard title="Daily Progress" description="Your momentum and learning state at a glance." accent="from-emerald-500/20 to-slate-500/10">
                <div className="grid gap-4 md:grid-cols-2">
                  <ActivityCard title="Daily Goal" value="82% complete" detail="Your current target is on track." />
                  <ActivityCard title="Learning Streak" value={`${Math.max(3, stats.studyHours - 2)} days`} detail="Keep the streak alive today." />
                  <ActivityCard title="Lessons Completed" value={stats.completedLessons} detail="Learning paths moved forward." />
                  <ActivityCard title="Quiz Average" value={`${stats.accuracy}%`} detail="Accuracy staying steady." />
                </div>
              </DashboardCard>

              <DashboardCard title="AI Recommendations" description="Suggested next moves for stronger retention and growth." accent="from-cyan-500/20 to-sky-500/10">
                <div className="space-y-3">
                  {stats.recommendations.map((item) => <RecommendationCard key={item} title={item.split(':')[0]} detail={item.split(':').slice(1).join(':').trim() || item} />)}
                </div>
              </DashboardCard>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <DashboardCard title="Recent Activity" description="Recent learning milestones and engagement." accent="from-amber-500/20 to-orange-500/10">
                <div className="space-y-3">
                  {stats.recentActivity.map((item, index) => (
                    <div key={`${item.title}-${index}`} className="rounded-[1.25rem] border border-white/10 bg-slate-950/70 p-4">
                      <p className="font-semibold text-white">{item.title}</p>
                      <p className="mt-1 text-sm text-slate-400">{item.detail}</p>
                    </div>
                  ))}
                </div>
              </DashboardCard>

              <DashboardCard title="Upcoming Tasks" description="The next few things to do for continued momentum." accent="from-fuchsia-500/20 to-violet-500/10">
                <div className="space-y-3">
                  {stats.upcomingTasks.map((task) => (
                    <div key={task} className="flex items-center gap-2 rounded-[1.25rem] border border-white/10 bg-slate-950/70 p-4 text-sm text-slate-300">
                      <RefreshCw className="h-4 w-4 text-fuchsia-300" />
                      <span>{task}</span>
                    </div>
                  ))}
                </div>
              </DashboardCard>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <DashboardCard title="Saved Courses & Documents" description="Your study assets and active learning materials." accent="from-indigo-500/20 to-cyan-500/10">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-[1.25rem] border border-white/10 bg-slate-950/70 p-4">
                    <p className="text-sm text-slate-400">Saved Courses</p>
                    <div className="mt-3 space-y-2">
                      {stats.savedCourseNames.length ? stats.savedCourseNames.map((name) => <div key={name} className="rounded-xl bg-slate-800/80 px-3 py-2 text-sm text-slate-200">{name}</div>) : <p className="text-sm text-slate-500">No saved courses yet.</p>}
                    </div>
                  </div>
                  <div className="rounded-[1.25rem] border border-white/10 bg-slate-950/70 p-4">
                    <p className="text-sm text-slate-400">Uploaded Documents</p>
                    <div className="mt-3 space-y-2">
                      {stats.recentDocuments.length ? stats.recentDocuments.map((entry, index) => <div key={`${entry.fileName}-${index}`} className="rounded-xl bg-slate-800/80 px-3 py-2 text-sm text-slate-200">{entry.fileName}</div>) : <p className="text-sm text-slate-500">No documents added yet.</p>}
                    </div>
                  </div>
                </div>
              </DashboardCard>

              <DashboardCard title="Achievements" description="Milestones that reflect your growth and consistency." accent="from-emerald-500/20 to-lime-500/10">
                <div className="grid gap-3 sm:grid-cols-2">
                  {stats.achievements.map((achievement) => <AchievementCard key={achievement} title={achievement} text="Unlocked through consistent learning." />)}
                </div>
              </DashboardCard>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
              <DashboardCard title="Weak Topics" description="Where attention will create the biggest gains." accent="from-rose-500/20 to-orange-500/10">
                <div className="space-y-3">
                  {stats.weakTopics.map((topic) => <div key={topic} className="rounded-[1.25rem] border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">{topic}</div>)}
                </div>
              </DashboardCard>
              <DashboardCard title="Strong Topics" description="Areas that are already becoming reliable and confident." accent="from-emerald-500/20 to-teal-500/10">
                <div className="space-y-3">
                  {stats.strongTopics.map((topic) => <div key={topic} className="rounded-[1.25rem] border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">{topic}</div>)}
                </div>
              </DashboardCard>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
