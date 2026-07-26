import { BookOpen, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function ExamInstructions({ exam }) {
  if (!exam) {
    return <div className="text-sm text-slate-400">The instruction panel will appear once the exam is generated.</div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-cyan-300"><BookOpen className="h-4 w-4" /> Instructions</div>
      <div className="rounded-[1rem] border border-white/10 bg-slate-950/70 p-4 text-sm text-slate-400">
        <p className="text-white">Mode: {exam.mode}</p>
        <p className="mt-2">Duration: {exam.duration} minutes</p>
        <p className="mt-2">Total Marks: {exam.totalMarks}</p>
        <p className="mt-2">Evaluation Criteria: {exam.evaluationCriteria}</p>
        <div className="mt-3 flex items-center gap-2 text-cyan-300"><CheckCircle2 className="h-4 w-4" /> All questions are dynamically generated and adaptive.</div>
        <div className="mt-2 flex items-center gap-2 text-amber-300"><AlertTriangle className="h-4 w-4" /> Auto-submit is enabled when time expires.</div>
      </div>
    </div>
  );
}
