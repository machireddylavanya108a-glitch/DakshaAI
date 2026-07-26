export default function DashboardCard({ title, description, children, accent = 'from-indigo-500/20 to-cyan-500/10', border = 'border-white/10' }) {
  return (
    <div className={`rounded-[2rem] border ${border} bg-slate-900/75 p-6 shadow-2xl shadow-slate-950/40 backdrop-blur-xl`}>
      <div className={`mb-4 rounded-2xl bg-gradient-to-br ${accent} p-3`}>
        <p className="text-sm uppercase tracking-[0.25em] text-slate-200">{title}</p>
      </div>
      {description ? <p className="mb-4 text-sm text-slate-400">{description}</p> : null}
      {children}
    </div>
  );
}
