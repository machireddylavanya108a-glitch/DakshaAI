import { History } from 'lucide-react';

export default function ExamHistory({ history }) {
  return (
    <div>
      <div className="flex items-center gap-2 text-cyan-300"><History className="h-4 w-4" /> Previous Exams</div>
      <div className="mt-4 space-y-2 text-sm text-slate-400">
        {history.length ? history.map((entry) => (
          <div key={entry.id || entry.createdAt} className="rounded-[1rem] border border-white/10 bg-slate-950/70 p-3">
            <p className="text-white">{entry.subject}</p>
            <p className="mt-1">{entry.examType} • {entry.percentage}%</p>
          </div>
        )) : <div className="rounded-[1rem] border border-white/10 bg-slate-950/70 p-3">No previous exams yet.</div>}
      </div>
    </div>
  );
}
