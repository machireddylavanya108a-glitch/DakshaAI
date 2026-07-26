import { History } from 'lucide-react';

export default function CertificateHistory({ history }) {
  return (
    <div>
      <div className="flex items-center gap-2 text-cyan-300"><History className="h-4 w-4" /> Certificate History</div>
      <div className="mt-4 space-y-2 text-sm text-slate-400">
        {history.length ? history.map((entry) => (
          <div key={entry.id || entry.certificateId} className="rounded-[1rem] border border-white/10 bg-slate-950/70 p-3">
            <p className="text-white">{entry.courseName}</p>
            <p className="mt-1">{entry.certificateType} • {entry.grade}</p>
          </div>
        )) : <div className="rounded-[1rem] border border-white/10 bg-slate-950/70 p-3">No certificates issued yet.</div>}
      </div>
    </div>
  );
}
