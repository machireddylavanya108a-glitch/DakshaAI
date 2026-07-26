import { KeyRound, ShieldCheck } from 'lucide-react';

export default function APIKeysManager() {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-6">
      <div className="flex items-center gap-2 text-emerald-200"><KeyRound className="h-5 w-5" /> API keys & access</div>
      <p className="mt-3 text-sm text-slate-400">Create, rotate, and revoke API keys and service credentials with policy enforcement.</p>
    </div>
  );
}
