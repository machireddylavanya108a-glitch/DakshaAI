import { PlusCircle, Save, Sparkles, Palette, Share2, Download } from 'lucide-react';

export default function Toolbar({ title, onTitleChange, onCreate, onSave, status, theme, onThemeChange }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-violet-300">
          <Sparkles className="h-4 w-4" /> Board controls
        </div>
        <div className="rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-xs text-violet-200">{status}</div>
      </div>

      <input value={title} onChange={(event) => onTitleChange(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-slate-800/80 px-3 py-2 text-sm text-white outline-none" placeholder="Board title" />

      <div className="flex flex-wrap gap-2">
        <button onClick={onCreate} className="rounded-2xl bg-gradient-to-r from-cyan-500 to-violet-500 px-3 py-2 text-sm font-semibold text-white">New board</button>
        <button onClick={onSave} className="rounded-2xl border border-white/10 bg-slate-800/80 px-3 py-2 text-sm text-slate-200">Save</button>
        <button className="rounded-2xl border border-white/10 bg-slate-800/80 px-3 py-2 text-sm text-slate-200">Share</button>
      </div>

      <div className="rounded-2xl border border-white/10 bg-slate-800/60 p-3 text-sm text-slate-300">
        <div className="mb-2 flex items-center gap-2"><Palette className="h-4 w-4 text-amber-300" /> Theme</div>
        <select value={theme} onChange={(event) => onThemeChange(event.target.value)} className="w-full rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2 text-white outline-none">
          <option value="midnight">Midnight</option>
          <option value="aurora">Aurora</option>
          <option value="ocean">Ocean</option>
          <option value="sunset">Sunset</option>
        </select>
      </div>
    </div>
  );
}
