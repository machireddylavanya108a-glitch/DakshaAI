import { GitBranch, Sparkles } from 'lucide-react';

export default function MindMapTool() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-violet-300">
        <GitBranch className="h-4 w-4" /> Mind map generator
      </div>
      <div className="rounded-2xl border border-white/10 bg-slate-800/60 p-3 text-sm text-slate-300">
        Convert text into mind maps • generate concepts • build branches • reveal relationships
      </div>
    </div>
  );
}
