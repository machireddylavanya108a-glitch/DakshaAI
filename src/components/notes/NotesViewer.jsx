import { FileText, Languages } from 'lucide-react';

export default function NotesViewer({ note }) {
  if (!note) return null;

  return (
    <div>
      <div className="flex items-center gap-2 text-cyan-300"><FileText className="h-4 w-4" /> Notes Preview</div>
      <div className="mt-4 rounded-[1rem] border border-white/10 bg-slate-950/70 p-4 text-sm text-slate-400">
        <p className="text-xl font-semibold text-white">{note.title}</p>
        <p className="mt-2">Source: {note.sourceName}</p>
        <p className="mt-1">Language: {note.language}</p>
        <div className="mt-4 whitespace-pre-wrap text-slate-300">{note.content}</div>
      </div>
    </div>
  );
}
