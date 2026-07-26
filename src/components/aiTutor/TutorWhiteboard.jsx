import { PenTool } from 'lucide-react';

export default function TutorWhiteboard({ lesson }) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-slate-900/75 p-5 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
      <div className="flex items-center gap-2 text-indigo-300"><PenTool className="h-4 w-4" /> Interactive Whiteboard</div>
      <div className="mt-4 rounded-[1.2rem] border border-dashed border-white/10 bg-slate-950/70 p-6 text-sm text-slate-400">
        <p className="text-white">AI whiteboard preview</p>
        <div className="mt-4 grid gap-2">
          {lesson.steps.map((step) => <div key={step} className="rounded-[1rem] border border-white/10 bg-slate-900/80 px-3 py-2">{step}</div>)}
        </div>
      </div>
    </div>
  );
}
