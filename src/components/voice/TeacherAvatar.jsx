import { Sparkles } from 'lucide-react';

export default function TeacherAvatar({ isSpeaking }) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/40">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-[0.35em] text-emerald-300">AI Voice Teacher</p>
          <h3 className="mt-2 text-xl font-semibold text-white">Your personalized tutor</h3>
        </div>
        <div className="rounded-full border border-emerald-500/30 bg-emerald-500/10 p-3 text-emerald-300">
          <Sparkles className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-5 flex items-center justify-center rounded-[2rem] border border-slate-800 bg-gradient-to-br from-emerald-500/20 via-slate-900/60 to-sky-500/20 p-8">
        <div className="relative flex h-32 w-32 items-center justify-center rounded-full border border-white/10 bg-slate-950/80">
          <div className="absolute inset-0 rounded-full border-4 border-emerald-400/40" />
          <div className={`absolute h-24 w-24 rounded-full bg-gradient-to-br from-emerald-400 to-sky-400 transition-all ${isSpeaking ? 'scale-110' : 'scale-100'}`} />
          <div className="relative h-12 w-12 rounded-full bg-slate-950/90" />
          {isSpeaking ? (
            <div className="absolute -bottom-4 flex items-end gap-1">
              {[0, 1, 2, 3].map((bar) => (
                <div key={bar} className="h-6 w-1.5 rounded-full bg-emerald-300 animate-pulse" style={{ animationDelay: `${bar * 120}ms` }} />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
