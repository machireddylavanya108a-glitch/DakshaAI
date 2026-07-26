export default function PluginSearch({ value, onChange }) {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-4">
      <label className="mb-2 block text-sm text-slate-400">Search plugins</label>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none ring-0"
        placeholder="Search agents, tools, themes, and packs"
      />
    </div>
  );
}
