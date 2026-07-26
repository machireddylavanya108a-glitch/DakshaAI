import { ArrowRight } from 'lucide-react';

export default function RelatedTopics() {
  const topics = ['Related subjects', 'Real-world applications', 'Interview questions', 'Quiz', 'Flashcards'];
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-emerald-300">
        <ArrowRight className="h-4 w-4" /> Related topics
      </div>
      <div className="flex flex-wrap gap-2">
        {topics.map((topic) => <div key={topic} className="rounded-2xl border border-white/10 bg-slate-800/60 px-3 py-2 text-sm text-slate-200">{topic}</div>)}
      </div>
    </div>
  );
}
