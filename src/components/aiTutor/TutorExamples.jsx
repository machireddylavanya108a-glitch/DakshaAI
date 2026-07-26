import { Sparkles } from 'lucide-react';

export default function TutorExamples({ lesson }) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-slate-900/75 p-5 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
      <div className="flex items-center gap-2 text-indigo-300"><Sparkles className="h-4 w-4" /> Examples & Applications</div>
      <div className="mt-4 space-y-2 text-sm text-slate-400">
        {lesson.examples.map((item) => <div key={item} className="rounded-[1rem] border border-white/10 bg-slate-950/70 p-3">{item}</div>)}
        {lesson.applications.map((item) => <div key={item} className="rounded-[1rem] border border-white/10 bg-slate-900/80 p-3">{item}</div>)}
      </div>
    </div>
  );
}
