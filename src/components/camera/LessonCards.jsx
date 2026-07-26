export default function LessonCards({ lesson }) {
  if (!lesson) return null;

  const cards = [
    { title: 'Key Concepts', items: lesson.keyConcepts || [] },
    { title: 'Definitions', items: lesson.importantDefinitions || [] },
    { title: 'Examples', items: lesson.examples || [] },
    { title: 'Applications', items: lesson.realWorldApplications || [] },
    { title: 'Revision Notes', items: lesson.revisionNotes || [] },
    { title: 'Cheat Sheet', items: lesson.cheatSheet || [] }
  ];

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {cards.map((card) => (
        <div key={card.title} className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/40">
          <p className="text-sm uppercase tracking-[0.35em] text-emerald-300">{card.title}</p>
          {card.items.length ? (
            <ul className="mt-4 space-y-2 text-sm text-slate-300">
              {card.items.slice(0, 8).map((item, index) => (
                <li key={`${card.title}-${index}`} className="rounded-2xl border border-slate-800 bg-slate-950/70 px-3 py-2">{item}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-slate-500">No content generated yet.</p>
          )}
        </div>
      ))}
    </div>
  );
}
