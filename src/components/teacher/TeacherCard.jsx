import { Copy, Download } from 'lucide-react';

export default function TeacherCard({ title, description, content, icon: Icon, onCopy, onDownload }) {
  const safeContent = content || 'No content generated yet.';

  return (
    <div className="rounded-3xl border border-slate-800/70 bg-slate-900/70 p-6 shadow-2xl shadow-slate-950/40 backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-indigo-500/60">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="mb-3 inline-flex rounded-2xl border border-indigo-500/20 bg-indigo-500/10 p-2 text-indigo-400">
            <Icon className="h-5 w-5" />
          </div>
          <h3 className="text-xl font-semibold text-white">{title}</h3>
          <p className="mt-1 text-sm text-slate-400">{description}</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={onCopy} className="rounded-xl border border-slate-700 bg-slate-950/80 p-2 text-slate-300 transition hover:border-indigo-500" aria-label={`Copy ${title}`}>
            <Copy className="h-4 w-4" />
          </button>
          <button type="button" onClick={onDownload} className="rounded-xl border border-slate-700 bg-slate-950/80 p-2 text-slate-300 transition hover:border-indigo-500" aria-label={`Download ${title}`}>
            <Download className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-sm leading-relaxed text-slate-300 whitespace-pre-wrap max-h-60 overflow-y-auto">
        {safeContent}
      </div>
    </div>
  );
}
