export default function SkillCard({ icon: Icon, title, description, onClick, active }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group rounded-[1.6rem] border p-6 text-left transition-all duration-300 ${active ? 'border-indigo-500 bg-indigo-500/10 shadow-lg shadow-indigo-950/20' : 'border-slate-800 bg-slate-900/80 hover:-translate-y-1 hover:border-indigo-500/60'}`}
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/10 p-3 text-indigo-400">
          <Icon className="h-6 w-6" />
        </div>
        <span className="text-sm text-slate-500 transition group-hover:text-indigo-400">Explore →</span>
      </div>
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
    </button>
  );
}
