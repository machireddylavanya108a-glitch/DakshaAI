import { CheckCircle2, Clock3, ListTree, PlayCircle } from 'lucide-react';

export default function LessonTimeline({ chapters = [], currentChapterIndex = 0, estimatedMinutesLeft = 0 }) {
  return (
    <section className="rounded-[1.75rem] border border-white/10 bg-slate-900/80 p-5 shadow-xl shadow-slate-950/30" aria-label="Lesson timeline">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-cyan-300">
          <ListTree className="h-4 w-4" />
          <p className="text-xs uppercase tracking-[0.3em]">Lesson Timeline</p>
        </div>
        <div className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-950/70 px-3 py-1 text-xs text-slate-300">
          <Clock3 className="h-3.5 w-3.5" /> ~{estimatedMinutesLeft} min left
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {chapters.map((chapter, index) => {
          const completed = index < currentChapterIndex;
          const active = index === currentChapterIndex;

          return (
            <div key={`${chapter.title}-${index}`} className={`rounded-xl border px-3 py-2 ${active ? 'border-cyan-500/30 bg-cyan-500/10' : completed ? 'border-emerald-500/20 bg-emerald-500/10' : 'border-slate-800 bg-slate-950/70'}`}>
              <div className="flex items-start gap-2">
                {completed ? <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-300" /> : active ? <PlayCircle className="mt-0.5 h-4 w-4 text-cyan-300" /> : <span className="mt-0.5 inline-block h-4 w-4 rounded-full border border-slate-600" />}
                <div>
                  <p className="text-sm font-semibold text-white">{chapter.title}</p>
                  <p className="text-xs text-slate-400">{chapter.estimatedMinutes} min</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
