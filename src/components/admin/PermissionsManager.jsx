import { Lock, CheckCircle2 } from 'lucide-react';

export default function PermissionsManager() {
  const items = ['User management', 'Content publishing', 'AI model access', 'Billing controls', 'Audit visibility', 'Security overrides'];

  return (
    <div className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-6">
      <div className="flex items-center gap-2 text-cyan-200">
        <Lock className="h-5 w-5" />
        <h2 className="text-xl font-semibold">Permission Matrix</h2>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {items.map((item) => (
          <div key={item} className="flex items-center gap-2 rounded-[1.2rem] border border-white/10 bg-slate-800/60 p-3 text-sm text-slate-300">
            <CheckCircle2 className="h-4 w-4 text-emerald-300" /> {item}
          </div>
        ))}
      </div>
    </div>
  );
}
