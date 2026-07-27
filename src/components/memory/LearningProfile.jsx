import { Clock3, Sparkles, Target, TrendingUp, BookOpenCheck, Languages } from 'lucide-react';

export default function LearningProfile({ profile }) {
  const stats = profile?.statistics || {};
  const brainProfile = profile?.memoryBrain?.learningProfile || {};
  return (
    <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/40">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-[0.35em] text-emerald-300">Learning Profile</p>
          <h3 className="mt-2 text-xl font-semibold text-white">Your study intelligence snapshot</h3>
        </div>
        <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 p-2 text-emerald-300">
          <Sparkles className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[1.25rem] border border-slate-800 bg-slate-950/70 p-4">
          <div className="flex items-center gap-2 text-slate-400"><Clock3 className="h-4 w-4" /> Study hours</div>
          <p className="mt-2 text-2xl font-semibold text-white">{stats.totalStudyHours || 0}</p>
        </div>
        <div className="rounded-[1.25rem] border border-slate-800 bg-slate-950/70 p-4">
          <div className="flex items-center gap-2 text-slate-400"><BookOpenCheck className="h-4 w-4" /> Lessons</div>
          <p className="mt-2 text-2xl font-semibold text-white">{stats.lessonsCompleted || 0}</p>
        </div>
        <div className="rounded-[1.25rem] border border-slate-800 bg-slate-950/70 p-4">
          <div className="flex items-center gap-2 text-slate-400"><TrendingUp className="h-4 w-4" /> Quiz avg</div>
          <p className="mt-2 text-2xl font-semibold text-white">{stats.averageQuizScore || 0}%</p>
        </div>
        <div className="rounded-[1.25rem] border border-slate-800 bg-slate-950/70 p-4">
          <div className="flex items-center gap-2 text-slate-400"><Target className="h-4 w-4" /> Streak</div>
          <p className="mt-2 text-2xl font-semibold text-white">{stats.learningStreak || 0} days</p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="rounded-[1.25rem] border border-slate-800 bg-slate-950/70 p-4 text-sm text-slate-300">
          <p className="text-slate-400">Last activity</p>
          <p className="mt-2 font-medium text-white">{stats.lastActivity || 'No activity yet'}</p>
        </div>
        <div className="rounded-[1.25rem] border border-slate-800 bg-slate-950/70 p-4 text-sm text-slate-300">
          <p className="text-slate-400">Preferred language</p>
          <p className="mt-2 font-medium text-white">{profile?.preferences?.language || 'English'}</p>
        </div>
        <div className="rounded-[1.25rem] border border-slate-800 bg-slate-950/70 p-4 text-sm text-slate-300">
          <p className="text-slate-400">Teacher style</p>
          <p className="mt-2 font-medium text-white">{brainProfile.preferredTeacherStyle || profile?.preferences?.teacherStyle || 'friendly'}</p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-[1.25rem] border border-slate-800 bg-slate-950/70 p-4 text-sm text-slate-300">
          <p className="text-slate-400">Learning style</p>
          <p className="mt-2 font-medium text-white">{brainProfile.learningStyle || 'Adaptive'}</p>
          <p className="mt-3 text-slate-400">Speed: {brainProfile.speed || 'Balanced'} • Confidence: {brainProfile.confidence || 0}%</p>
        </div>
        <div className="rounded-[1.25rem] border border-slate-800 bg-slate-950/70 p-4 text-sm text-slate-300">
          <p className="text-slate-400">Interests and career goals</p>
          <p className="mt-2 font-medium text-white">{(brainProfile.interests || []).slice(0, 4).join(', ') || 'Not enough data yet'}</p>
          <p className="mt-3 text-slate-400">{brainProfile.careerGoals || 'Career goals will evolve from your activity.'}</p>
        </div>
      </div>
    </div>
  );
}
