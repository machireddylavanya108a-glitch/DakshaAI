import { Code2 } from 'lucide-react';

export default function CodeBlock() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-fuchsia-300">
        <Code2 className="h-4 w-4" /> Code blocks
      </div>
      <div className="rounded-2xl border border-white/10 bg-slate-800/60 p-3 text-sm text-slate-300">
        Embed code snippets, algorithms, system design blocks, and technical workflows into the board.
      </div>
    </div>
  );
}
