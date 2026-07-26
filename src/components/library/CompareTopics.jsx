import { GitCompareArrows } from 'lucide-react';

export default function CompareTopics() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-pink-300">
        <GitCompareArrows className="h-4 w-4" /> Compare topics
      </div>
      <div className="rounded-2xl border border-white/10 bg-slate-800/60 p-3 text-sm text-slate-300">
        Compare concepts, tools, frameworks, methods, or subjects side by side with summaries, pros, cons, and use cases.
      </div>
    </div>
  );
}
