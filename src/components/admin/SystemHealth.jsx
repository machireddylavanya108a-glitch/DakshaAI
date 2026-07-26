import { Activity, ServerCog } from 'lucide-react';

export default function SystemHealth() {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-6">
      <div className="flex items-center gap-2 text-emerald-200"><Activity className="h-5 w-5" /> System health</div>
      <p className="mt-3 text-sm text-slate-400">Track uptime, service stability, queue depth, and system resilience metrics.</p>
    </div>
  );
}
