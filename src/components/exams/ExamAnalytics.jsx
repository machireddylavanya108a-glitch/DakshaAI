import { BarChart3, TrendingUp } from 'lucide-react';

export default function ExamAnalytics({ analytics }) {
  return (
    <div>
      <div className="flex items-center gap-2 text-cyan-300"><BarChart3 className="h-4 w-4" /> Analytics</div>
      <div className="mt-4 space-y-2 text-sm text-slate-400">
        <div className="rounded-[1rem] border border-white/10 bg-slate-950/70 p-3">Overall Score: {analytics.overallScore}</div>
        <div className="rounded-[1rem] border border-white/10 bg-slate-950/70 p-3">Accuracy: {analytics.accuracy}%</div>
        <div className="rounded-[1rem] border border-white/10 bg-slate-950/70 p-3">Completion Rate: {analytics.completionRate}%</div>
        <div className="rounded-[1rem] border border-white/10 bg-slate-950/70 p-3">Time Analysis: {analytics.timeAnalysis}</div>
        <div className="rounded-[1rem] border border-white/10 bg-slate-950/70 p-3">Difficulty: {analytics.questionDifficulty}</div>
        <div className="rounded-[1rem] border border-white/10 bg-slate-950/70 p-3">Topic Performance: {analytics.topicPerformance}</div>
        <div className="rounded-[1rem] border border-white/10 bg-slate-950/70 p-3">Weak Concepts: {analytics.weakConcepts.join(', ')}</div>
        <div className="rounded-[1rem] border border-white/10 bg-slate-950/70 p-3">Strong Concepts: {analytics.strongConcepts.join(', ')}</div>
      </div>
    </div>
  );
}
