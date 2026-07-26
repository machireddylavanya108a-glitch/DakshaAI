export default function ProgressChart({ data = [], label = 'Progress' }) {
  if (!data.length) {
    return <div className="rounded-[1.5rem] border border-dashed border-slate-700 p-4 text-sm text-slate-500">No data available yet.</div>;
  }

  const max = Math.max(...data.map((item) => item.value || 0), 1);
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/70 p-4">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-slate-400">{label}</p>
        <p className="text-sm text-emerald-300">Live trend</p>
      </div>
      <div className="flex h-40 items-end gap-2">
        {data.map((item, index) => (
          <div key={`${item.label}-${index}`} className="flex flex-1 flex-col items-center gap-2">
            <div className="flex h-32 w-full items-end rounded-2xl bg-slate-900 p-1">
              <div className="w-full rounded-[1rem] bg-gradient-to-t from-emerald-500 to-cyan-400" style={{ height: `${(item.value / max) * 100}%` }} />
            </div>
            <span className="text-xs text-slate-500">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
