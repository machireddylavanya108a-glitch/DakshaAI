import { Gauge } from 'lucide-react';

export default function PerformanceMonitor() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-emerald-300">
        <Gauge className="h-4 w-4" /> Performance monitoring
      </div>
      <div className="rounded-2xl border border-white/10 bg-slate-800/60 p-3 text-sm text-slate-300">
        Adaptive frame budgeting, battery-aware rendering, and memory-safe animation controls keep the experience fluid even on lower-end devices.
      </div>
    </div>
  );
}
