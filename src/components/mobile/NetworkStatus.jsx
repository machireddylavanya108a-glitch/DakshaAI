import { Wifi } from 'lucide-react';

export default function NetworkStatus() {
  return (
    <div className="rounded-[1.5rem] border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300">
      <div className="flex items-center gap-2"><Wifi className="h-4 w-4" /> Network is online. Sync and streaming features are ready.</div>
    </div>
  );
}
