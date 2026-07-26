import { Home, Compass, BookOpen, User } from 'lucide-react';

export default function BottomNavigation({ deviceType }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-emerald-300">
        <Home className="h-4 w-4" /> Bottom navigation
      </div>
      <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-800/80 p-3 text-slate-300">
        <div className="flex flex-col items-center gap-1"><Home className="h-4 w-4" /><span className="text-xs">Home</span></div>
        <div className="flex flex-col items-center gap-1"><Compass className="h-4 w-4" /><span className="text-xs">Explore</span></div>
        <div className="flex flex-col items-center gap-1"><BookOpen className="h-4 w-4" /><span className="text-xs">Learn</span></div>
        <div className="flex flex-col items-center gap-1"><User className="h-4 w-4" /><span className="text-xs">Profile</span></div>
      </div>
      <div className="text-sm text-slate-400">Optimized for thumb reach and compact {deviceType} layouts.</div>
    </div>
  );
}
