export default function ChartViewer({ charts = [] }) {
  if (!charts.length) return null;

  return (
    <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/40">
      <h3 className="text-xl font-semibold text-white">Charts</h3>
      <div className="mt-4 space-y-3">
        {charts.map((chart, index) => (
          <div key={`${chart.title || 'chart'}-${index}`} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
            <p className="text-sm font-semibold text-white">{chart.title || `Chart ${index + 1}`}</p>
            <p className="mt-2 text-sm text-slate-400">{chart.type || 'Chart'} • {chart.description || 'Visual insight'}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
