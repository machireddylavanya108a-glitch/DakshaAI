export default function StatCard({ label, value, hint, icon: Icon, accent = 'text-emerald-300' }) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/70 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-slate-400">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
        </div>
        {Icon ? <div className={`rounded-2xl bg-slate-900/80 p-3 ${accent}`}><Icon className="h-5 w-5" /></div> : null}
      </div>
      {hint ? <p className="mt-3 text-sm text-slate-500">{hint}</p> : null}
    </div>
  );
}
