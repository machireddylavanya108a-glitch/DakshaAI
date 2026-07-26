import { FileBarChart, TrendingUp } from 'lucide-react';

export default function ReportsManager() {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-6">
      <div className="flex items-center gap-2 text-violet-200"><FileBarChart className="h-5 w-5" /> Operational reports</div>
      <p className="mt-3 text-sm text-slate-400">Generate snapshots for revenue, usage, retention, and product performance.</p>
    </div>
  );
}
