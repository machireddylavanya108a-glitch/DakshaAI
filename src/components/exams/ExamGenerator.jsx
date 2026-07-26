import { Wand2 } from 'lucide-react';

export default function ExamGenerator({ exam, onGenerate }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-cyan-300"><Wand2 className="h-4 w-4" /> AI Question Paper Generator</div>
      {exam ? (
        <div className="rounded-[1rem] border border-white/10 bg-slate-950/70 p-4 text-sm text-slate-400">
          <p className="text-white">{exam.title}</p>
          <p className="mt-2">Difficulty: {exam.difficulty}</p>
          <p className="mt-1">Questions: {exam.questions.length}</p>
          <p className="mt-1">Marking Scheme: {exam.markingScheme}</p>
          <p className="mt-1">Rubrics: {exam.rubric}</p>
        </div>
      ) : (
        <div className="rounded-[1rem] border border-white/10 bg-slate-950/70 p-4 text-sm text-slate-400">No exam generated yet. Create one to unlock question generation, hints, solutions, answer keys, and evaluation logic.</div>
      )}
      <button onClick={onGenerate} className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-200">Regenerate Exam</button>
    </div>
  );
}
