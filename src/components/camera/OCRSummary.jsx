export default function OCRSummary({ lesson }) {
  if (!lesson) return null;

  return (
    <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/40">
      <p className="text-sm uppercase tracking-[0.35em] text-emerald-300">AI Learning Summary</p>
      <h3 className="mt-2 text-xl font-semibold text-white">{lesson.title || 'AI-generated lesson'}</h3>
      <p className="mt-4 text-sm leading-7 text-slate-300">{lesson.summary || 'Your lesson summary will appear here.'}</p>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <div className="rounded-[1.25rem] border border-slate-800 bg-slate-950/70 p-4">
          <p className="text-sm text-slate-400">Beginner</p>
          <p className="mt-2 text-sm text-slate-200">{lesson.beginnerLesson || 'Start with the core idea.'}</p>
        </div>
        <div className="rounded-[1.25rem] border border-slate-800 bg-slate-950/70 p-4">
          <p className="text-sm text-slate-400">Intermediate</p>
          <p className="mt-2 text-sm text-slate-200">{lesson.intermediateLesson || 'Connect the extracted details together.'}</p>
        </div>
        <div className="rounded-[1.25rem] border border-slate-800 bg-slate-950/70 p-4">
          <p className="text-sm text-slate-400">Advanced</p>
          <p className="mt-2 text-sm text-slate-200">{lesson.advancedLesson || 'Deepen your understanding with the supporting context.'}</p>
        </div>
      </div>
    </div>
  );
}
