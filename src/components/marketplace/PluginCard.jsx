import { Download, ShieldCheck, Star } from 'lucide-react';

export default function PluginCard({ plugin }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-xl font-semibold">{plugin.name}</h3>
          <p className="mt-1 text-sm text-slate-400">{plugin.tagline}</p>
        </div>
        {plugin.verified ? <ShieldCheck className="h-5 w-5 text-emerald-400" /> : null}
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-xs text-cyan-200">{plugin.category}</span>
        <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">{plugin.price}</span>
      </div>
      <p className="mb-4 text-sm text-slate-400">{plugin.description}</p>
      <div className="mb-6 flex items-center justify-between text-sm text-slate-400">
        <span className="flex items-center gap-1"><Star className="h-4 w-4 text-amber-400" /> {plugin.rating}</span>
        <span className="flex items-center gap-1"><Download className="h-4 w-4" /> {plugin.downloads.toLocaleString()}</span>
      </div>
      <button className="w-full rounded-2xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-200 transition hover:bg-cyan-500/20">Install</button>
    </div>
  );
}
