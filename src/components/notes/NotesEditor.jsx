import { PencilRuler } from 'lucide-react';

export default function NotesEditor({ note, onChange }) {
  if (!note) return null;

  return (
    <div>
      <div className="flex items-center gap-2 text-cyan-300"><PencilRuler className="h-4 w-4" /> Rich Editor</div>
      <div className="mt-4 rounded-[1rem] border border-white/10 bg-slate-950/70 p-3">
        <div className="mb-3 flex flex-wrap gap-2 text-xs text-slate-400">
          <span className="rounded-full border border-white/10 px-2 py-1">Undo</span>
          <span className="rounded-full border border-white/10 px-2 py-1">Redo</span>
          <span className="rounded-full border border-white/10 px-2 py-1">Bold</span>
          <span className="rounded-full border border-white/10 px-2 py-1">Italic</span>
          <span className="rounded-full border border-white/10 px-2 py-1">Underline</span>
          <span className="rounded-full border border-white/10 px-2 py-1">Checklist</span>
          <span className="rounded-full border border-white/10 px-2 py-1">Highlight</span>
          <span className="rounded-full border border-white/10 px-2 py-1">Annotations</span>
        </div>
        <textarea value={note.content} onChange={(event) => onChange(event.target.value)} className="min-h-60 w-full rounded-[0.9rem] border border-white/10 bg-slate-900/80 px-3 py-3 text-sm text-slate-200 outline-none" />
      </div>
    </div>
  );
}
