import { FolderOpen } from 'lucide-react';

export default function NotesFolder({ notes }) {
  const folders = [...new Set(notes.map((note) => note.folder).filter(Boolean))];

  return (
    <div>
      <div className="flex items-center gap-2 text-cyan-300"><FolderOpen className="h-4 w-4" /> Folders</div>
      <div className="mt-4 space-y-2 text-sm text-slate-400">
        {folders.length ? folders.map((folder) => <div key={folder} className="rounded-[1rem] border border-white/10 bg-slate-950/70 p-3">{folder}</div>) : <div className="rounded-[1rem] border border-white/10 bg-slate-950/70 p-3">No folders yet.</div>}
      </div>
    </div>
  );
}
