import { Palette, Maximize2, Search, Sparkles, Languages, History, Download } from 'lucide-react';

export default function MindMapToolbar({ status, theme, onThemeChange, onFullscreen }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-violet-300">
          <Sparkles className="h-4 w-4" /> Mind map actions
        </div>
        <div className="rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-xs text-violet-200">{status}</div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button onClick={onFullscreen} className="rounded-2xl border border-white/10 bg-slate-800/80 px-3 py-2 text-sm text-slate-200">Fullscreen</button>
        <button className="rounded-2xl border border-white/10 bg-slate-800/80 px-3 py-2 text-sm text-slate-200">Auto layout</button>
        <button className="rounded-2xl border border-white/10 bg-slate-800/80 px-3 py-2 text-sm text-slate-200">Highlight links</button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-slate-800/60 p-3 text-sm text-slate-300">
          <div className="mb-2 flex items-center gap-2"><Palette className="h-4 w-4 text-amber-300" /> Themes</div>
          <select value={theme} onChange={(event) => onThemeChange(event.target.value)} className="w-full rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2 text-white outline-none">
            <option value="Aurora">Aurora</option>
            <option value="Nebula">Nebula</option>
            <option value="Ocean">Ocean</option>
            <option value="Sunset">Sunset</option>
            <option value="Midnight">Midnight</option>
          </select>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-800/60 p-3 text-sm text-slate-300">
          <div className="mb-2 flex items-center gap-2"><Languages className="h-4 w-4 text-emerald-300" /> Multilingual</div>
          <div className="text-xs text-slate-400">100+ languages supported • auto translation</div>
        </div>
      </div>
    </div>
  );
}
