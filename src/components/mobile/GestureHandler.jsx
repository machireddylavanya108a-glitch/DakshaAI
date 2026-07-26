import { Move } from 'lucide-react';

export default function GestureHandler() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-cyan-300">
        <Move className="h-4 w-4" /> Touch & gesture support
      </div>
      <div className="rounded-2xl border border-white/10 bg-slate-800/60 p-3 text-sm text-slate-300">
        Swipe navigation, pinch zoom, drag and drop, long press, double tap, and haptic feedback support are available on compatible devices.
      </div>
    </div>
  );
}
