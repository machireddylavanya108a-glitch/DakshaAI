import { StickyNote } from 'lucide-react';

export default function StickyNotes() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-amber-300">
        <StickyNote className="h-4 w-4" /> Sticky notes & ideas
      </div>
      <div className="grid gap-2 md:grid-cols-3">
        {['Brainstorm', 'Questions', 'Priorities'].map((item) => (
          <div key={item} className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-3 text-sm text-amber-100">{item}</div>
        ))}
      </div>
    </div>
  );
}
