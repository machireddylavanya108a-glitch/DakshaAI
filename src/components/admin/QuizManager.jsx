import { ClipboardCheck, BrainCircuit } from 'lucide-react';

export default function QuizManager() {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-6">
      <div className="flex items-center gap-2 text-cyan-200"><ClipboardCheck className="h-5 w-5" /> Quiz governance</div>
      <p className="mt-3 text-sm text-slate-400">Create, review, and monitor quiz performance with adaptive scoring controls.</p>
    </div>
  );
}
