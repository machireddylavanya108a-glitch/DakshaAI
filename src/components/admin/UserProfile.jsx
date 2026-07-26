import { BadgeCheck, BookOpen, Trophy, Sparkles } from 'lucide-react';

export default function UserProfile() {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-cyan-200">
            <BadgeCheck className="h-5 w-5" />
            <h2 className="text-xl font-semibold">User Intelligence Profile</h2>
          </div>
          <p className="mt-2 text-sm text-slate-400">Review activity, progress, achievements, certificates, and subscription tier.</p>
        </div>
        <div className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-200">Premium cohort</div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="rounded-[1.5rem] border border-white/10 bg-slate-800/60 p-4">
          <div className="flex items-center gap-2 text-sm text-slate-400"><BookOpen className="h-4 w-4" /> Learning progress</div>
          <div className="mt-3 text-3xl font-semibold text-white">86%</div>
        </div>
        <div className="rounded-[1.5rem] border border-white/10 bg-slate-800/60 p-4">
          <div className="flex items-center gap-2 text-sm text-slate-400"><Trophy className="h-4 w-4" /> Achievements</div>
          <div className="mt-3 text-3xl font-semibold text-white">24</div>
        </div>
        <div className="rounded-[1.5rem] border border-white/10 bg-slate-800/60 p-4">
          <div className="flex items-center gap-2 text-sm text-slate-400"><Sparkles className="h-4 w-4" /> Certificates</div>
          <div className="mt-3 text-3xl font-semibold text-white">7</div>
        </div>
      </div>
    </div>
  );
}
