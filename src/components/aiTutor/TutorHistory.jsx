import { History } from 'lucide-react';

export default function TutorHistory({ history }) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-slate-900/75 p-5 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
      <div className="flex items-center gap-2 text-indigo-300"><History className="h-4 w-4" /> Learning History</div>
      <div className="mt-4 space-y-2 text-sm text-slate-400">
        {history.length === 0 ? <div className="rounded-[1rem] border border-white/10 bg-slate-950/70 p-3">No tutor sessions yet. Start learning to build your history.</div> : history.slice(0, 4).map((entry) => <div key={entry.id} className="rounded-[1rem] border border-white/10 bg-slate-950/70 p-3"><p className="text-white">{entry.topic}</p><p className="mt-1 text-xs text-indigo-200">Progress: {entry.progress}%</p></div>)}
      </div>
    </div>
  );
}
