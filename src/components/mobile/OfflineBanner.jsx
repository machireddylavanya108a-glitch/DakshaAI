import { WifiOff } from 'lucide-react';

export default function OfflineBanner() {
  return (
    <div className="rounded-[1.5rem] border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-300">
      <div className="flex items-center gap-2"><WifiOff className="h-4 w-4" /> Offline mode is active. Learning, notes, and progress will sync when the connection is restored.</div>
    </div>
  );
}
