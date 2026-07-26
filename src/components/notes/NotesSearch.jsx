import { Search } from 'lucide-react';

export default function NotesSearch({ value, onChange }) {
  return (
    <div>
      <div className="flex items-center gap-2 text-cyan-300"><Search className="h-4 w-4" /> Search Notes</div>
      <div className="mt-3 rounded-[1rem] border border-white/10 bg-slate-950/70 p-3">
        <input value={value} onChange={(event) => onChange(event.target.value)} placeholder="Search by title, keyword, topic, or content" className="w-full rounded-[0.8rem] border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-200 outline-none" />
      </div>
    </div>
  );
}
