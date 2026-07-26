import { FileText } from 'lucide-react';

export default function PDFAnnotation() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-cyan-300">
        <FileText className="h-4 w-4" /> PDF & documents
      </div>
      <div className="rounded-2xl border border-white/10 bg-slate-800/60 p-3 text-sm text-slate-300">
        Import notes, documents, slides, research papers, and annotate them directly on the canvas.
      </div>
    </div>
  );
}
