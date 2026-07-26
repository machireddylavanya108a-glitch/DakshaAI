import { CheckCircle2 } from 'lucide-react';

export default function AnswerReview({ result }) {
  if (!result) return null;

  return (
    <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-5 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
      <div className="flex items-center gap-2 text-cyan-300"><CheckCircle2 className="h-4 w-4" /> Answer Review</div>
      <div className="mt-4 space-y-3 text-sm text-slate-400">
        {result.results.map((item) => (
          <div key={item.id} className="rounded-[1rem] border border-white/10 bg-slate-950/70 p-3">
            <p className="text-white">{item.prompt}</p>
            <p className="mt-2">Awarded: {item.evaluation?.awarded || 0} / {item.marks}</p>
            <p className="mt-1">Feedback: {item.evaluation?.feedback}</p>
            <p className="mt-1">Suggestion: {item.evaluation?.suggestions}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
