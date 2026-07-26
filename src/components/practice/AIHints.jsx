import { Sparkles } from 'lucide-react';

export default function AIHints({ practiceSet }) {
  return (
    <div>
      <div className="flex items-center gap-2 text-cyan-300"><Sparkles className="h-4 w-4" /> AI Hints</div>
      <div className="mt-4 space-y-3 text-sm text-slate-400">
        {practiceSet.questions.slice(0, 3).map((question, index) => (
          <div key={question.id} className="rounded-[1rem] border border-white/10 bg-slate-950/70 p-3">
            <p className="font-medium text-white">Hint {index + 1}</p>
            <p className="mt-1">{question.hint || 'Focus on the core concept and test the most probable answer first.'}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
