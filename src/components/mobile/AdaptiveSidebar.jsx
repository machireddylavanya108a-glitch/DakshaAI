import { PanelLeft } from 'lucide-react';

export default function AdaptiveSidebar({ deviceType }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-pink-300">
        <PanelLeft className="h-4 w-4" /> Adaptive sidebar
      </div>
      <div className="rounded-2xl border border-white/10 bg-slate-800/60 p-3 text-sm text-slate-300">
        Sidebar behavior automatically adapts for {deviceType} devices, from compact drawers to expanded navigation.
      </div>
    </div>
  );
}
