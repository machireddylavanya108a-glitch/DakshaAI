import { useMemo } from 'react';
import { CalendarDays, Clock3, Flame, Rocket, Target, Trophy } from 'lucide-react';

function Card({ title, children, subtitle }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-5 shadow-xl shadow-slate-950/25">
      <p className="text-xs uppercase tracking-[0.25em] text-cyan-300">{title}</p>
      {subtitle ? <p className="mt-2 text-sm text-slate-400">{subtitle}</p> : null}
      <div className="mt-4">{children}</div>
    </div>
  );
}

export default function PersonalizedLearningDashboard({ plan, onResume }) {
  const milestones = useMemo(() => plan?.plan?.weeklyMilestones || [], [plan]);
  const dailyTasks = useMemo(() => plan?.plan?.dailySchedule || [], [plan]);
  const monthly = useMemo(() => plan?.plan?.monthlyMilestones || [], [plan]);
  const recommendations = useMemo(() => plan?.plan?.aiRecommendations || [], [plan]);
  const completion = Number(plan?.progress?.completionPercent || 0);

  if (!plan) return null;

  const roadmapItems = Array.isArray(plan?.knowledgeDependency?.chain) ? plan.knowledgeDependency.chain : [];
  const lessonCards = Array.isArray(plan?.lessonEngine?.lessons) ? plan.lessonEngine.lessons : [];
  const careerPaths = Array.isArray(plan?.plan?.careerPaths) ? plan.plan.careerPaths : [];
  const badges = Array.isArray(plan?.progress?.achievementBadges) ? plan.progress.achievementBadges : [];

  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 via-slate-900/80 to-indigo-500/10 p-6 shadow-2xl shadow-slate-950/30">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-cyan-300">Personalized Learning Engine</p>
            <h2 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">{plan.topic || 'Adaptive learning journey'}</h2>
            <p className="mt-2 text-sm text-slate-300">Mode: {plan?.profile?.activeMode || 'Adaptive'} · Language: {plan?.analytics?.preferredLanguage || 'English'}</p>
          </div>
          <button onClick={onResume} className="inline-flex items-center gap-2 rounded-2xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400">
            <Rocket className="h-4 w-4" /> Resume Learning
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
            <p className="text-xs text-slate-400">Estimated Completion</p>
            <p className="mt-1 text-lg font-semibold text-white">{plan?.estimatedCompletion?.estimatedCompletionTime || 'Ready to start'}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
            <p className="text-xs text-slate-400">Total Learning Hours</p>
            <p className="mt-1 text-lg font-semibold text-white">{plan?.estimatedCompletion?.totalLearningHours || 0}h</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
            <p className="text-xs text-slate-400">Daily Target</p>
            <p className="mt-1 text-lg font-semibold text-white">{plan?.statistics?.dailyMinutesTarget || 60} min</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
            <p className="text-xs text-slate-400">Completion</p>
            <p className="mt-1 text-lg font-semibold text-white">{completion}%</p>
          </div>
        </div>

        <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800">
          <div className="h-full bg-gradient-to-r from-cyan-400 via-indigo-500 to-violet-400" style={{ width: `${Math.max(0, Math.min(100, completion))}%` }} />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Roadmap Timeline" subtitle="Prerequisite-aware sequence">
          <div className="space-y-2">
            {roadmapItems.length ? roadmapItems.map((item, index) => (
              <div key={`${item}-${index}`} className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-sm text-slate-200">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-cyan-500/15 text-cyan-300">{index + 1}</span>
                <span>{item}</span>
              </div>
            )) : <p className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3 text-sm text-slate-400">The prerequisite chain will appear here once the topic is structured.</p>}
          </div>
        </Card>

        <Card title="Progress Tracker" subtitle="Auto-saved progression model">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-sm text-slate-300">
              <div className="flex items-center gap-2 text-cyan-300"><Flame className="h-4 w-4" /> Daily Streak</div>
              <p className="mt-2 text-lg font-semibold text-white">{plan?.progress?.dailyStreak || 0} days</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-sm text-slate-300">
              <div className="flex items-center gap-2 text-cyan-300"><Clock3 className="h-4 w-4" /> Time Studied</div>
              <p className="mt-2 text-lg font-semibold text-white">{plan?.progress?.timeStudiedMinutes || 0} min</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-sm text-slate-300 sm:col-span-2">
              <div className="flex items-center gap-2 text-cyan-300"><CalendarDays className="h-4 w-4" /> Estimated Date</div>
              <p className="mt-2 text-lg font-semibold text-white">{plan?.progress?.estimatedCompletionDate ? new Date(plan.progress.estimatedCompletionDate).toLocaleDateString() : 'Scheduled soon'}</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card title="Calendar + Daily Tasks" subtitle="Plan your next 7 days">
          <div className="space-y-2">
            {dailyTasks.length ? dailyTasks.map((task) => (
              <div key={task.day} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3 text-sm text-slate-200">
                <p className="font-semibold text-cyan-200">{task.day}: {task.topic}</p>
                <p className="mt-1 text-xs text-slate-400">{task.durationMinutes} min</p>
              </div>
            )) : <p className="text-sm text-slate-400">Daily tasks will be filled in as the plan is shaped.</p>}
          </div>
        </Card>

        <Card title="Weekly Goals" subtitle="Short horizon milestones">
          <div className="space-y-2">
            {milestones.length ? milestones.map((item) => (
              <div key={item.title} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3 text-sm text-slate-200">
                <p className="font-semibold text-white">{item.title}</p>
                <p className="mt-1 text-slate-400">{item.deliverable}</p>
              </div>
            )) : <p className="text-sm text-slate-400">Weekly milestones will appear once the roadmap is generated.</p>}
          </div>
        </Card>

        <Card title="Monthly Goals" subtitle="Long horizon outcomes">
          <div className="space-y-2">
            {monthly.length ? monthly.map((item) => (
              <div key={item.title} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3 text-sm text-slate-200">
                <p className="font-semibold text-white">{item.title}</p>
                <p className="mt-1 text-slate-400">{item.deliverable}</p>
              </div>
            )) : <p className="text-sm text-slate-400">Longer-term goals will appear after the plan is expanded.</p>}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="AI Recommendations" subtitle="Adaptive optimization suggestions">
          <div className="space-y-2">
            {recommendations.length ? recommendations.map((item, index) => (
              <div key={`${item}-${index}`} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3 text-sm text-slate-200">{item}</div>
            )) : <p className="text-sm text-slate-400">Recommendations will be generated as the lesson progresses.</p>}
          </div>
        </Card>

        <Card title="Upcoming Lessons" subtitle="Lesson engine preview">
          <div className="space-y-2">
            {lessonCards.length ? lessonCards.map((lesson) => (
              <div key={lesson.lessonId} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3 text-sm text-slate-200">
                <p className="font-semibold text-white">{lesson.title}</p>
                <p className="mt-1 text-slate-400">{lesson.nextLessonPreview}</p>
                <div className="mt-2 flex items-center gap-2 text-xs text-cyan-200">
                  <Target className="h-3.5 w-3.5" /> Easy · Medium · Hard · Expert
                </div>
              </div>
            )) : <p className="text-sm text-slate-400">Lesson cards will be generated after the first learning pass.</p>}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Career Layer" subtitle="Outcome-focused pathway">
          <div className="space-y-2 text-sm text-slate-200">
            {careerPaths.length ? careerPaths.map((item, index) => (
              <div key={`${item}-${index}`} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3">{item}</div>
            )) : <p className="text-sm text-slate-400">Career pathways will appear when the learning goal is clear.</p>}
            <p className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-amber-100">{plan?.plan?.salaryInformation || 'Salary context will be added once the career goal is defined.'}</p>
          </div>
        </Card>

        <Card title="Achievement Badges" subtitle="Progress milestones">
          <div className="flex flex-wrap gap-2">
            {badges.length ? badges.map((badge) => (
              <div key={badge} className="inline-flex items-center gap-1 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-100">
                <Trophy className="h-3.5 w-3.5" /> {badge}
              </div>
            )) : <p className="text-sm text-slate-400">Badges will appear as the learner reaches milestones.</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}
