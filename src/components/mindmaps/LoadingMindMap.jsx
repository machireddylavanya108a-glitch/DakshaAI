import { Brain } from 'lucide-react';

export default function LoadingMindMap() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
      <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-10 text-center shadow-2xl">
        <div className="mb-4 flex justify-center">
          <div className="rounded-full border border-violet-400/20 bg-violet-500/10 p-4">
            <Brain className="h-8 w-8 text-violet-300" />
          </div>
        </div>
        <h2 className="text-2xl font-semibold">Preparing your mind map workspace</h2>
        <p className="mt-2 text-sm text-slate-400">Loading templates, canvas controls, and AI generation tools.</p>
      </div>
    </div>
  );
}
