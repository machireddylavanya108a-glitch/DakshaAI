export default function PluginDetails({ plugin }) {
  if (!plugin) return null;

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6">
      <h3 className="text-2xl font-semibold">{plugin.name}</h3>
      <p className="mt-2 text-sm text-slate-400">{plugin.description}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <span className="rounded-full bg-slate-800 px-3 py-1 text-sm text-slate-300">{plugin.category}</span>
        <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-sm text-cyan-200">{plugin.price}</span>
      </div>
    </div>
  );
}
