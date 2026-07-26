import { BookOpen } from 'lucide-react';

export default function TutorRoadmap({ lesson }) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-slate-900/75 p-5 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
      <div className="flex items-center gap-2 text-indigo-300"><BookOpen className="h-4 w-4" /> Learning Roadmap</div>
      <div className="mt-4 space-y-2 text-sm text-slate-400">
        {lesson.roadmap.map((item) => <div key={item} className="rounded-[1rem] border border-white/10 bg-slate-950/70 p-3">{item}</div>)}
      </div>
    </div>
  );
}
