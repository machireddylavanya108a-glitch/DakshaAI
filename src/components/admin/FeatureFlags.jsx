import { ToggleLeft, Settings2 } from 'lucide-react';

export default function FeatureFlags() {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-6">
      <div className="flex items-center gap-2 text-violet-200"><ToggleLeft className="h-5 w-5" /> Feature flags</div>
      <p className="mt-3 text-sm text-slate-400">Roll out enterprise features, experiment safely, and manage progressive releases.</p>
    </div>
  );
}
