import { Loader } from 'lucide-react';

export default function LoadingTeacher() {
  return (
    <div className="rounded-3xl border border-slate-800/70 bg-slate-900/70 p-10 text-center shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-400">
        <Loader className="h-8 w-8 animate-spin" />
      </div>
      <h2 className="mt-6 text-2xl font-semibold text-white">Preparing your lesson</h2>
      <p className="mt-3 text-slate-400">Daksha is building a complete, teacher-style explanation for your topic.</p>
    </div>
  );
}
