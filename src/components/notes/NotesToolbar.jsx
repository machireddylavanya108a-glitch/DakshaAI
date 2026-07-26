import { BookOpen, Languages, Search, Sparkles } from 'lucide-react';

export default function NotesToolbar({ status }) {
  return (
    <div>
      <div className="flex items-center gap-2 text-cyan-300"><Sparkles className="h-4 w-4" /> Workspace Status</div>
      <div className="mt-4 rounded-[1rem] border border-white/10 bg-slate-950/70 p-4 text-sm text-slate-400">
        <p>{status}</p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
          <span className="rounded-full border border-white/10 px-2 py-1">100+ languages supported</span>
          <span className="rounded-full border border-white/10 px-2 py-1">Auto translation</span>
          <span className="rounded-full border border-white/10 px-2 py-1">Voice reading</span>
        </div>
      </div>
    </div>
  );
}
