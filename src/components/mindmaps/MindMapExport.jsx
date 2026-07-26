import { Download, FileJson, FileText, Image, MonitorPlay } from 'lucide-react';

export default function MindMapExport({ map }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-emerald-300">
        <Download className="h-4 w-4" /> Export & print
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        {['PNG', 'JPG', 'SVG', 'PDF', 'JSON', 'Markdown', 'HTML'].map((type) => (
          <div key={type} className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-800/60 px-3 py-3 text-sm text-slate-200">
            <span>{type}</span>
            <span className="text-slate-400">Ready</span>
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-white/10 bg-slate-800/60 p-3 text-sm text-slate-400">Print ready output and share-friendly exports are prepared for {map?.title || 'your current map'}.</div>
    </div>
  );
}
