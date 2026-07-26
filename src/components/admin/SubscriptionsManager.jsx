import { Sparkles, Crown, Building2 } from 'lucide-react';

export default function SubscriptionsManager() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {[
        { name: 'Free', icon: Sparkles },
        { name: 'Pro', icon: Crown },
        { name: 'Enterprise', icon: Building2 },
      ].map((tier) => (
        <div key={tier.name} className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-4">
          <div className="flex items-center gap-2 text-cyan-200"><tier.icon className="h-4 w-4" /> {tier.name}</div>
          <p className="mt-3 text-sm text-slate-400">Manage access, limits, billing state, and renewal flows.</p>
        </div>
      ))}
    </div>
  );
}
