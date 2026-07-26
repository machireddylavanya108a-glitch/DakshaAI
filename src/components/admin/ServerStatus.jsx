import { Server } from 'lucide-react';

export default function ServerStatus() {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-6">
      <div className="flex items-center gap-2 text-cyan-200"><Server className="h-5 w-5" /> Server status</div>
      <p className="mt-3 text-sm text-slate-400">Observe API and infrastructure availability across regional deployments.</p>
    </div>
  );
}
