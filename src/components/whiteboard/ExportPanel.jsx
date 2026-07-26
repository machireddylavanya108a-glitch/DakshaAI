import { Download, FileJson, FileText, Image as ImageIcon } from 'lucide-react';

export default function ExportPanel() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-cyan-300">
        <Download className="h-4 w-4" /> Import & export
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        {['PNG', 'JPG', 'SVG', 'PDF', 'Markdown', 'JSON'].map((type) => (
          <div key={type} className="rounded-2xl border border-white/10 bg-slate-800/60 px-3 py-3 text-sm text-slate-200">{type}</div>
        ))}
      </div>
    </div>
  );
}
