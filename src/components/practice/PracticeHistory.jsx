import { History } from 'lucide-react';

export default function PracticeHistory({ history }) {
  return (
    <div>
      <div className="flex items-center gap-2 text-cyan-300"><History className="h-4 w-4" /> Practice History</div>
      <div className="mt-4 space-y-2 text-sm text-slate-400">
        {history.length ? history.slice(0, 4).map((entry) => (
          <div key={entry.id} className="rounded-[1rem] border border-white/10 bg-slate-950/70 p-3">
            <div className="flex items-center justify-between">
              <span className="text-white">{entry.topic}</span>
              <span className="text-cyan-300">{entry.accuracy}%</span>
            </div>
            <p className="mt-1">Readiness: {entry.readiness || 'Needs Practice'}</p>
            <p className="mt-1 text-xs text-slate-500">Learning Score: {entry.learningScore || 0} • Difficulty: {entry.difficulty || 'Adaptive'}</p>
          </div>
        )) : <div className="rounded-[1rem] border border-white/10 bg-slate-950/70 p-3">No sessions saved yet.</div>}
      </div>
    </div>
  );
}
