import { Trophy } from 'lucide-react';

export default function TutorProgress({ lesson }) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-slate-900/75 p-5 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
      <div className="flex items-center gap-2 text-indigo-300"><Trophy className="h-4 w-4" /> Progress</div>
      <div className="mt-4 rounded-[1.2rem] border border-white/10 bg-slate-950/70 p-4 text-sm text-slate-400">
        <div className="mb-2 flex items-center justify-between">
          <span>Current lesson progress</span>
          <span className="text-white">{lesson.progress}%</span>
        </div>
        <div className="h-2 rounded-full bg-slate-800">
          <div className="h-2 rounded-full bg-gradient-to-r from-indigo-400 to-cyan-400" style={{ width: `${lesson.progress}%` }} />
        </div>
      </div>
    </div>
  );
}
