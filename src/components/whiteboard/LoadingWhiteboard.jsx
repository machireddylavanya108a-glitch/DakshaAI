import { PanelsTopLeft } from 'lucide-react';

export default function LoadingWhiteboard() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
      <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-10 text-center shadow-2xl">
        <div className="mb-4 flex justify-center">
          <div className="rounded-full border border-cyan-400/20 bg-cyan-500/10 p-4">
            <PanelsTopLeft className="h-8 w-8 text-cyan-300" />
          </div>
        </div>
        <h2 className="text-2xl font-semibold">Preparing your whiteboard studio</h2>
        <p className="mt-2 text-sm text-slate-400">Loading tools, templates, and collaboration controls.</p>
      </div>
    </div>
  );
}
