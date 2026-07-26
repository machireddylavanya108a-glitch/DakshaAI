import { Clock3 } from 'lucide-react';

export default function KnowledgeTimeline() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-amber-300">
        <Clock3 className="h-4 w-4" /> Knowledge timeline
      </div>
      <div className="rounded-2xl border border-white/10 bg-slate-800/60 p-3 text-sm text-slate-300">
        See the history, latest developments, and the learning roadmap for any topic in one place.
      </div>
    </div>
  );
}
