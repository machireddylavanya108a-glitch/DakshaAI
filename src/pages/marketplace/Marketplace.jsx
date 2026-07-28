import { useMemo } from 'react';
import { Sparkles, ShieldCheck, BookOpen } from 'lucide-react';
import { getCoreLearningModules } from '../../utils/missionHelpers';

export default function Marketplace() {
  const modules = useMemo(() => getCoreLearningModules(), []);

  return (
    <div className="min-h-screen bg-slate-950 text-white px-6 py-8 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 flex items-center gap-2 text-sm text-cyan-300">
                <Sparkles className="h-4 w-4" /> Daksha AI Learning OS
              </div>
              <h1 className="text-3xl font-semibold sm:text-4xl">The operating system for learning anything, from any source, in any language</h1>
              <p className="mt-3 max-w-3xl text-sm text-slate-400 sm:text-base">
                Daksha AI stays focused on helping people learn effectively through scanning, understanding, teaching, practice, memory, and assessment.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
            <div className="mb-4 flex items-center gap-2 text-cyan-300">
              <BookOpen className="h-5 w-5" /> Core learning modules
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {modules.map((module) => (
                <div key={module.name} className="rounded-2xl border border-slate-800 bg-slate-950/70 px-3 py-3 text-sm text-slate-300">
                  {module.name}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6">
            <div className="mb-4 flex items-center gap-2 text-cyan-300">
              <ShieldCheck className="h-5 w-5" /> Mission-first product direction
            </div>
            <p className="text-sm text-slate-400">
              Marketplace-style features and unrelated product categories have been removed so Daksha AI remains dedicated to teaching, understanding, and accelerating learning.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
