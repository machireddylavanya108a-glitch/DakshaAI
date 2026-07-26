import { Trophy, Sparkles } from 'lucide-react';

export default function ExamResult({ result }) {
  if (!result) return null;

  return (
    <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-5 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
      <div className="flex items-center gap-2 text-cyan-300"><Trophy className="h-4 w-4" /> Examination Result</div>
      <div className="mt-4 space-y-3 text-sm text-slate-400">
        <div className="rounded-[1rem] border border-white/10 bg-slate-950/70 p-3">
          <p className="text-white">Score: {result.scoredMarks} / {result.exam.totalMarks}</p>
          <p className="mt-1">Percentage: {result.percentage}%</p>
          <p className="mt-1">Performance: {result.percentage >= 80 ? 'Excellent' : result.percentage >= 60 ? 'Good' : 'Needs Review'}</p>
        </div>
        <div className="rounded-[1rem] border border-white/10 bg-slate-950/70 p-3">
          <p className="text-white">Recommendations</p>
          <p className="mt-1">{result.analytics.recommendations.join(' ')}</p>
        </div>
      </div>
    </div>
  );
}
