import { Smartphone, Tablet, Monitor } from 'lucide-react';

export default function ResponsiveLayout({ deviceType }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-cyan-300">
        <Smartphone className="h-4 w-4" /> Responsive layout
      </div>
      <div className="rounded-2xl border border-white/10 bg-slate-800/60 p-3 text-sm text-slate-300">
        Current device mode: <span className="font-semibold text-white">{deviceType}</span>
      </div>
      <div className="grid gap-2 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-slate-800/60 p-3 text-sm text-slate-200"><Tablet className="mb-2 h-4 w-4 text-violet-300" /> Tablet-friendly cards</div>
        <div className="rounded-2xl border border-white/10 bg-slate-800/60 p-3 text-sm text-slate-200"><Monitor className="mb-2 h-4 w-4 text-cyan-300" /> Desktop dashboards</div>
        <div className="rounded-2xl border border-white/10 bg-slate-800/60 p-3 text-sm text-slate-200"><Smartphone className="mb-2 h-4 w-4 text-emerald-300" /> Mobile-first controls</div>
      </div>
    </div>
  );
}
