import { History } from 'lucide-react';

export default function VersionHistory() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-amber-300">
        <History className="h-4 w-4" /> Version history
      </div>
      <div className="rounded-2xl border border-white/10 bg-slate-800/60 p-3 text-sm text-slate-300">
        Review board revisions, restore snapshots, and preserve collaboration history automatically.
      </div>
    </div>
  );
}
