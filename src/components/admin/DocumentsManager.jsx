import { FileText, FileImage, FileArchive } from 'lucide-react';

export default function DocumentsManager() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {['PDFs', 'Docs', 'Media bundles'].map((item) => (
        <div key={item} className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-4">
          <div className="flex items-center gap-2 text-emerald-200"><FileText className="h-4 w-4" /> {item}</div>
          <p className="mt-3 text-sm text-slate-400">Store, organize, and govern uploaded documentation.</p>
        </div>
      ))}
    </div>
  );
}
