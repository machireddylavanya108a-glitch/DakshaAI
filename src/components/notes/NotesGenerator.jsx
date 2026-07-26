import { Sparkles } from 'lucide-react';

export default function NotesGenerator({ notes, onGenerate }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-cyan-300"><Sparkles className="h-4 w-4" /> AI Note Builder</div>
      <div className="rounded-[1rem] border border-white/10 bg-slate-950/70 p-4 text-sm text-slate-400">
        <p className="text-white">{notes.length ? `${notes.length} notes ready` : 'No notes yet'}</p>
        <p className="mt-2">This engine creates structured notes with headings, bullets, definitions, formulae, examples, interview questions, revision tips, and memory tricks.</p>
      </div>
      <button onClick={onGenerate} className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-200">Create Another Note Set</button>
    </div>
  );
}
