import { PlusCircle, Save, Sparkles, BookOpen, Bookmark, History, TrendingUp } from 'lucide-react';

export default function LibraryDashboard({ onAdd, onSave, status }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-cyan-300">
          <Sparkles className="h-4 w-4" /> Knowledge library controls
        </div>
        <div className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-200">{status}</div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button onClick={onAdd} className="rounded-2xl bg-gradient-to-r from-cyan-500 to-violet-500 px-3 py-2 text-sm font-semibold text-white">Add entry</button>
        <button onClick={onSave} className="rounded-2xl border border-white/10 bg-slate-800/80 px-3 py-2 text-sm text-slate-200">Save</button>
      </div>
      <div className="grid gap-3 rounded-2xl border border-white/10 bg-slate-800/60 p-3 text-sm text-slate-400 md:grid-cols-3">
        <div className="flex items-center gap-2"><BookOpen className="h-4 w-4 text-cyan-300" /> Books & docs</div>
        <div className="flex items-center gap-2"><Bookmark className="h-4 w-4 text-amber-300" /> Bookmarks</div>
        <div className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-emerald-300" /> Trending</div>
      </div>
    </div>
  );
}
