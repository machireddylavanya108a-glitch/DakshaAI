import { FileText, Sparkles, BookOpenText } from 'lucide-react';

export default function ExtractedText({ sections, concepts, definitions, formulas, diagrams, bookmarks }) {
  const items = [
    { title: 'Extracted Text', value: sections?.length || 0, icon: FileText },
    { title: 'Key Concepts', value: concepts?.length || 0, icon: Sparkles },
    { title: 'Definitions', value: definitions?.length || 0, icon: BookOpenText },
  ];

  return (
    <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/40">
      <p className="text-sm uppercase tracking-[0.35em] text-emerald-300">Knowledge Map</p>
      <h3 className="mt-2 text-xl font-semibold text-white">Detected content</h3>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {items.map((item) => (
          <div key={item.title} className="rounded-[1.25rem] border border-slate-800 bg-slate-950/70 p-4">
            <div className="flex items-center gap-2 text-slate-300">
              <item.icon className="h-4 w-4 text-emerald-400" />
              <span className="text-sm">{item.title}</span>
            </div>
            <p className="mt-2 text-2xl font-semibold text-white">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 space-y-3 text-sm text-slate-300">
        {sections?.length ? <div><p className="font-semibold text-white">Detected sections</p><ul className="mt-2 list-disc space-y-1 pl-5">{sections.slice(0, 6).map((item) => <li key={item}>{item}</li>)}</ul></div> : null}
        {concepts?.length ? <div><p className="font-semibold text-white">Key concepts</p><ul className="mt-2 list-disc space-y-1 pl-5">{concepts.slice(0, 6).map((item) => <li key={item}>{item}</li>)}</ul></div> : null}
        {definitions?.length ? <div><p className="font-semibold text-white">Definitions</p><ul className="mt-2 list-disc space-y-1 pl-5">{definitions.slice(0, 6).map((item) => <li key={item}>{item}</li>)}</ul></div> : null}
        {formulas?.length ? <div><p className="font-semibold text-white">Formulas</p><ul className="mt-2 list-disc space-y-1 pl-5">{formulas.slice(0, 6).map((item) => <li key={item}>{item}</li>)}</ul></div> : null}
        {diagrams?.length ? <div><p className="font-semibold text-white">Diagrams</p><ul className="mt-2 list-disc space-y-1 pl-5">{diagrams.slice(0, 6).map((item) => <li key={item}>{item}</li>)}</ul></div> : null}
        {bookmarks?.length ? <div><p className="font-semibold text-white">Bookmarks</p><ul className="mt-2 list-disc space-y-1 pl-5">{bookmarks.slice(0, 6).map((item) => <li key={item}>{item}</li>)}</ul></div> : null}
      </div>
    </div>
  );
}
