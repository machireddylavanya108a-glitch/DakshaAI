export default function DOCXOutline({ sections = [], definitions = [], tables = [], concepts = [], bookmarks = [] }) {
  const sectionsList = [
    { title: 'Sections', items: sections },
    { title: 'Definitions', items: definitions },
    { title: 'Tables', items: tables },
    { title: 'Key Concepts', items: concepts },
    { title: 'Bookmarks', items: bookmarks },
  ];

  return (
    <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/40">
      <h3 className="text-xl font-semibold text-white">DOCX Sidebar</h3>
      <div className="mt-4 space-y-4">
        {sectionsList.map((section) => (
          <div key={section.title} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
            <p className="mb-2 text-sm uppercase tracking-[0.3em] text-slate-400">{section.title}</p>
            {section.items.length === 0 ? <p className="text-sm text-slate-500">No items yet.</p> : <ul className="space-y-2 text-sm text-slate-300">
              {section.items.map((item, index) => <li key={`${section.title}-${index}`} className="rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2">{String(item)}</li>)}
            </ul>}
          </div>
        ))}
      </div>
    </div>
  );
}
