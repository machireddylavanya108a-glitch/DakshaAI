import { Sigma } from 'lucide-react';

export default function MathEditor() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-emerald-300">
        <Sigma className="h-4 w-4" /> Math & equations
      </div>
      <div className="rounded-2xl border border-white/10 bg-slate-800/60 p-3 text-sm text-slate-300">
        Insert math expressions, proofs, formulas, and reasoning steps for education and problem solving.
      </div>
    </div>
  );
}
