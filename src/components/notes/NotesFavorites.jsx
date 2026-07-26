import { Star } from 'lucide-react';

export default function NotesFavorites({ notes }) {
  return (
    <div>
      <div className="flex items-center gap-2 text-cyan-300"><Star className="h-4 w-4" /> Favorites</div>
      <div className="mt-4 space-y-2 text-sm text-slate-400">
        {notes.length ? notes.map((note) => <div key={note.id} className="rounded-[1rem] border border-white/10 bg-slate-950/70 p-3">{note.title}</div>) : <div className="rounded-[1rem] border border-white/10 bg-slate-950/70 p-3">No favorites yet.</div>}
      </div>
    </div>
  );
}
