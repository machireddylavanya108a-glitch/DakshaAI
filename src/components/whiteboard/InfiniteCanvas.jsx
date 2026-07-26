import { Maximize2, Move, Grid3X3, ScanLine, Compass, Ruler, Boxes } from 'lucide-react';

export default function InfiniteCanvas({ board, onUpdateBoard, theme }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-cyan-300">
          <Maximize2 className="h-4 w-4" /> Infinite canvas
        </div>
        <div className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-200">Unlimited zoom • pan • workspace</div>
      </div>

      <div className="rounded-[2rem] border border-white/10 bg-slate-950/60 p-4">
        <div className="mb-3 flex flex-wrap gap-2 text-xs text-slate-400">
          <span className="rounded-full border border-white/10 bg-slate-800/80 px-2 py-1">Mini map</span>
          <span className="rounded-full border border-white/10 bg-slate-800/80 px-2 py-1">Grid</span>
          <span className="rounded-full border border-white/10 bg-slate-800/80 px-2 py-1">Snap to grid</span>
          <span className="rounded-full border border-white/10 bg-slate-800/80 px-2 py-1">Guidelines</span>
          <span className="rounded-full border border-white/10 bg-slate-800/80 px-2 py-1">Rulers</span>
        </div>
        <div className="relative min-h-[240px] overflow-hidden rounded-[1.5rem] border border-white/10 bg-[radial-gradient(circle_at_center,_rgba(14,165,233,0.15),_transparent_40%)] p-6">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:32px_32px]" />
          <div className="relative z-10 rounded-2xl border border-white/10 bg-slate-900/70 p-4 text-sm text-slate-300">
            <div className="mb-2 flex items-center gap-2"><Move className="h-4 w-4 text-emerald-300" /> Workspace ready</div>
            <div className="text-xs text-slate-400">This whiteboard supports unlimited zoom, panning, sticky notes, flowcharts, diagrams, and more.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
