import { Menu, Compass, Home, Search, Sparkles } from 'lucide-react';

export default function MobileNavigation({ deviceType }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-violet-300">
        <Menu className="h-4 w-4" /> Mobile navigation
      </div>
      <div className="flex flex-wrap gap-2">
        {['Home', 'Learn', 'Search', 'Explore'].map((item) => (
          <button key={item} className="rounded-2xl border border-white/10 bg-slate-800/80 px-3 py-2 text-sm text-slate-200">{item}</button>
        ))}
      </div>
      <div className="rounded-2xl border border-white/10 bg-slate-800/60 p-3 text-sm text-slate-400">Adaptive navigation for {deviceType} screens with touch-friendly targets.</div>
    </div>
  );
}
