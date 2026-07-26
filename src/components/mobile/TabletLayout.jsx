import { Tablet } from 'lucide-react';

export default function TabletLayout({ deviceType }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-amber-300">
        <Tablet className="h-4 w-4" /> Tablet layout
      </div>
      <div className="rounded-2xl border border-white/10 bg-slate-800/60 p-3 text-sm text-slate-300">
        Two-column composition, larger touch targets, and richer split-screen content support for {deviceType} devices.
      </div>
    </div>
  );
}
