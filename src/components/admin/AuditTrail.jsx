import { History } from 'lucide-react';

export default function AuditTrail() {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-6">
      <div className="flex items-center gap-2 text-rose-200"><History className="h-5 w-5" /> Audit trail</div>
      <p className="mt-3 text-sm text-slate-400">Track admin actions, policy changes, and critical platform events.</p>
    </div>
  );
}
