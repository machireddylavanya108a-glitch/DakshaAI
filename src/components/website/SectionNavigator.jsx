export default function SectionNavigator({ sections = [], onSelectSection }) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/40">
      <h3 className="text-xl font-semibold text-white">Sections</h3>
      <div className="mt-4 space-y-2">
        {sections.length === 0 ? <p className="text-sm text-slate-500">No sections available yet.</p> : sections.map((section, index) => (
          <button key={`${section}-${index}`} onClick={() => onSelectSection?.(section)} className="flex w-full items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-left text-sm text-slate-300 transition hover:border-slate-700">
            <span>{section}</span>
            <span className="text-xs uppercase tracking-[0.2em] text-slate-500">{index + 1}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
