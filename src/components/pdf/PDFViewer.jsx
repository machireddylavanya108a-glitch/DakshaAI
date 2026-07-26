export default function PDFViewer({ fileName, previewText, onSearch }) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/40">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-[0.35em] text-cyan-300">PDF Preview</p>
          <h3 className="text-xl font-semibold text-white">{fileName || 'Uploaded Document'}</h3>
        </div>
        <input
          onChange={(event) => onSearch?.(event.target.value)}
          placeholder="Search inside PDF"
          className="rounded-2xl border border-slate-700 bg-slate-800/80 px-4 py-2 text-sm text-white outline-none"
        />
      </div>
      <div className="min-h-[320px] rounded-[1.5rem] border border-slate-800 bg-slate-950/70 p-5 text-sm leading-7 text-slate-300">
        {previewText ? <p className="whitespace-pre-wrap">{previewText}</p> : <p className="text-slate-500">Upload a PDF to preview extracted text here.</p>}
      </div>
    </div>
  );
}
