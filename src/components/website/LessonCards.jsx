export default function LessonCards({ lesson }) {
  if (!lesson) return null;

  const sections = [
    { title: 'Key Concepts', items: lesson.keyConcepts || [] },
    { title: 'Definitions', items: lesson.importantDefinitions || [] },
    { title: 'Examples', items: lesson.examples || [] },
    { title: 'Applications', items: lesson.realWorldApplications || [] },
  ];

  return (
    <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/40">
      <h3 className="text-xl font-semibold text-white">Learning Modules</h3>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {sections.map((section) => (
          <div key={section.title} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
            <p className="text-sm uppercase tracking-[0.3em] text-slate-400">{section.title}</p>
            <div className="mt-3 space-y-2">
              {section.items.length === 0 ? <p className="text-sm text-slate-500">No items yet.</p> : section.items.map((item, index) => <div key={`${section.title}-${index}`} className="rounded-2xl border border-slate-800 bg-slate-900/70 px-3 py-2 text-sm text-slate-300">{item}</div>)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
