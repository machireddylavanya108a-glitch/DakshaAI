import { Settings2, SlidersHorizontal } from 'lucide-react';

export default function SettingsPanel() {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-6">
      <div className="flex items-center gap-2 text-cyan-200"><Settings2 className="h-5 w-5" /> Platform settings</div>
      <p className="mt-3 text-sm text-slate-400">Adjust branding, integrations, security policies, environment controls, and operational defaults.</p>
    </div>
  );
}
