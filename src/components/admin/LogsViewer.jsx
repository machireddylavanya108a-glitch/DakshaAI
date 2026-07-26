import { ScrollText } from 'lucide-react';

export default function LogsViewer() {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-6">
      <div className="flex items-center gap-2 text-slate-200"><ScrollText className="h-5 w-5" /> Live logs</div>
      <p className="mt-3 text-sm text-slate-400">Inspect security, authentication, server, and platform event logs.</p>
    </div>
  );
}
