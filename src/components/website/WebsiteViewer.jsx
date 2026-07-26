export default function WebsiteViewer({ title, content, searchTerm, onSearch }) {
  const filteredContent = !searchTerm.trim() ? content : content.split(/\n+/).filter((line) => line.toLowerCase().includes(searchTerm.toLowerCase())).join('\n');

  return (
    <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/40">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.35em] text-emerald-300">Clean Content</p>
          <h3 className="text-xl font-semibold text-white">{title || 'Webpage content'}</h3>
        </div>
        <input value={searchTerm} onChange={(event) => onSearch?.(event.target.value)} placeholder="Search content" className="rounded-2xl border border-slate-700 bg-slate-800/80 px-4 py-2 text-sm text-white outline-none" />
      </div>
      <div className="min-h-[320px] rounded-[1.5rem] border border-slate-800 bg-slate-950/70 p-5 text-sm leading-7 text-slate-300">
        {filteredContent ? <pre className="whitespace-pre-wrap font-sans">{filteredContent}</pre> : <p className="text-slate-500">No content available yet.</p>}
      </div>
    </div>
  );
}
