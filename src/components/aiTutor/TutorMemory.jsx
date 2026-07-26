import { Bookmark, BrainCircuit } from 'lucide-react';

export default function TutorMemory({ lesson, dashboard }) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-slate-900/75 p-5 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
      <div className="flex items-center gap-2 text-indigo-300"><BrainCircuit className="h-4 w-4" /> Memory & Personalization</div>
      <div className="mt-4 space-y-3 text-sm text-slate-400">
        <div className="rounded-[1rem] border border-white/10 bg-slate-950/70 p-3"><strong className="text-white">Weak topics:</strong> {dashboard.weakConcepts.join(' • ')}</div>
        <div className="rounded-[1rem] border border-white/10 bg-slate-950/70 p-3"><strong className="text-white">Strong topics:</strong> {lesson.strongAreas.join(' • ')}</div>
        <div className="rounded-[1rem] border border-white/10 bg-slate-950/70 p-3"><strong className="text-white">Recent topics:</strong> {dashboard.recentTopics.join(' • ')}</div>
      </div>
    </div>
  );
}
