import { Hand, Sparkles } from 'lucide-react';

export default function FloatingToolbar() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-violet-300">
        <Hand className="h-4 w-4" /> Floating controls
      </div>
      <div className="flex flex-wrap gap-2">
        {['Swipe', 'Pinch', 'Long Press', 'Double Tap'].map((gesture) => (
          <div key={gesture} className="rounded-2xl border border-white/10 bg-slate-800/80 px-3 py-2 text-sm text-slate-200">{gesture}</div>
        ))}
      </div>
    </div>
  );
}
