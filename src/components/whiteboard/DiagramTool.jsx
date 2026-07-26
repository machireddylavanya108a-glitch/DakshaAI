import { Network } from 'lucide-react';

export default function DiagramTool() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-pink-300">
        <Network className="h-4 w-4" /> AI diagrams
      </div>
      <div className="rounded-2xl border border-white/10 bg-slate-800/60 p-3 text-sm text-slate-300">
        UML • ER diagrams • network diagrams • architecture diagrams • business models • project plans
      </div>
    </div>
  );
}
