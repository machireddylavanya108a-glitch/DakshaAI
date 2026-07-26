import { Star } from 'lucide-react';

export default function NotesCard({ note, onSelect, onFavorite }) {
  return (
    <button onClick={() => onSelect(note)} className="rounded-[1rem] border border-white/10 bg-slate-950/70 p-4 text-left text-sm text-slate-400">
      <div className="flex items-center justify-between gap-2">
        <p className="text-white">{note.title}</p>
        <button onClick={(event) => { event.stopPropagation(); onFavorite(note.id); }} className={`${note.favorite ? 'text-yellow-400' : 'text-slate-500'}`}>
          <Star className="h-4 w-4" />
        </button>
      </div>
      <p className="mt-2">{note.sourceType} • {note.language}</p>
      <p className="mt-1 text-cyan-300">{note.folder}</p>
    </button>
  );
}
