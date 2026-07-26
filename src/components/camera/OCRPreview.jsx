export default function OCRPreview({ ocrText, onEditText, onCopyText, onDownloadNotes }) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/40">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-[0.35em] text-emerald-300">OCR Preview</p>
          <h3 className="text-xl font-semibold text-white">Editable extracted text</h3>
        </div>
        <div className="flex gap-2">
          <button onClick={onCopyText} className="rounded-2xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-200">Copy Text</button>
          <button onClick={onDownloadNotes} className="rounded-2xl bg-emerald-500 px-3 py-2 text-sm font-semibold text-slate-950">Download Notes</button>
        </div>
      </div>

      <textarea
        value={ocrText}
        onChange={onEditText}
        className="mt-4 min-h-[220px] w-full rounded-[1.5rem] border border-slate-700 bg-slate-950/70 p-4 text-sm text-slate-200 outline-none"
        placeholder="Extracted OCR text will appear here. You can edit it before AI analysis."
      />
    </div>
  );
}
