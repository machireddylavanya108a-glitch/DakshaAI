import { FileText, Layers3 } from 'lucide-react';

export default function ContentManager() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {['Lessons', 'Knowledge Library', 'Whiteboards', 'Mind Maps'].map((item) => (
        <div key={item} className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-4">
          <div className="flex items-center gap-2 text-violet-200"><Layers3 className="h-4 w-4" /> {item}</div>
          <p className="mt-3 text-sm text-slate-400">Publish, approve, archive, and moderate enterprise content assets.</p>
        </div>
      ))}
    </div>
  );
}
