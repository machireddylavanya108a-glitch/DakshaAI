import { Download } from 'lucide-react';

export default function NotesExport({ note }) {
  if (!note) return null;

  return (
    <div>
      <div className="flex items-center gap-2 text-cyan-300"><Download className="h-4 w-4" /> Export</div>
      <div className="mt-4 rounded-[1rem] border border-white/10 bg-slate-950/70 p-4 text-sm text-slate-400">
        <p className="text-white">Export formats: PDF, DOCX, TXT, Markdown, HTML, Print Ready</p>
        <button className="mt-3 rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950">Export Note</button>
      </div>
    </div>
  );
}
