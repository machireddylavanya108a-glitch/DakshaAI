import { Sparkles } from 'lucide-react';

export default function AIExplain({ item }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-cyan-300">
        <Sparkles className="h-4 w-4" /> AI explanation
      </div>
      <div className="rounded-2xl border border-white/10 bg-slate-800/60 p-3 text-sm text-slate-300">
        {item?.explanation || 'Ask the AI to explain definitions, examples, comparisons, limitations, and learning paths.'}
      </div>
    </div>
  );
}
