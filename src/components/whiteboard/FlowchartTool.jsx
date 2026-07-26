import { Workflow } from 'lucide-react';

export default function FlowchartTool() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-cyan-300">
        <Workflow className="h-4 w-4" /> Flowcharts & process diagrams
      </div>
      <div className="rounded-2xl border border-white/10 bg-slate-800/60 p-3 text-sm text-slate-300">
        Generate process diagrams, roadmaps, decision trees, and organizational structures automatically.
      </div>
    </div>
  );
}
