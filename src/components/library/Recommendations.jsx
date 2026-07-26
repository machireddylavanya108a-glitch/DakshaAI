import { Lightbulb } from 'lucide-react';

export default function Recommendations() {
  const items = ['Continue learning', 'Suggested skills', 'Career paths', 'Industry skills', 'Advanced topics'];
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-violet-300">
        <Lightbulb className="h-4 w-4" /> Recommendations
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        {items.map((item) => <div key={item} className="rounded-2xl border border-white/10 bg-slate-800/60 px-3 py-3 text-sm text-slate-200">{item}</div>)}
      </div>
    </div>
  );
}
