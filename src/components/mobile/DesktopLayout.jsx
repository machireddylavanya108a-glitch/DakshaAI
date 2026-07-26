import { Monitor } from 'lucide-react';

export default function DesktopLayout({ deviceType }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-cyan-300">
        <Monitor className="h-4 w-4" /> Desktop & ultra-wide layout
      </div>
      <div className="rounded-2xl border border-white/10 bg-slate-800/60 p-3 text-sm text-slate-300">
        Multi-panel experiences and expanded workspace layouts are ready for {deviceType} screens.
      </div>
    </div>
  );
}
