import { Layers3 } from 'lucide-react';

export default function TutorFlashcards({ lesson }) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-slate-900/75 p-5 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
      <div className="flex items-center gap-2 text-indigo-300"><Layers3 className="h-4 w-4" /> Flashcards</div>
      <div className="mt-4 space-y-2 text-sm text-slate-400">
        {lesson.flashcards.map((item) => (
          <div key={item.front} className="rounded-[1rem] border border-white/10 bg-slate-950/70 p-3">
            <p className="text-white">Q: {item.front}</p>
            <p className="mt-1 text-xs text-indigo-200">A: {item.back}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
