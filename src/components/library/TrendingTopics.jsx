import { TrendingUp } from 'lucide-react';

export default function TrendingTopics() {
  const topics = ['AI Agents', 'Quantum Computing', 'Climate Tech', 'Cybersecurity', 'Healthcare AI'];
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-emerald-300">
        <TrendingUp className="h-4 w-4" /> Trending topics
      </div>
      <div className="flex flex-wrap gap-2">
        {topics.map((topic) => <div key={topic} className="rounded-2xl border border-white/10 bg-slate-800/60 px-3 py-2 text-sm text-slate-200">{topic}</div>)}
      </div>
    </div>
  );
}
