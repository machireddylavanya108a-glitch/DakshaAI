export default function PDFSummary({ overview, summary, keyPoints = [], importantDefinitions = [] }) {
  return (
    <div className="space-y-4">
      <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/40">
        <h3 className="text-xl font-semibold text-white">AI Summary</h3>
        <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-300">{summary || overview || 'No summary generated yet.'}</p>
      </div>
      <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/40">
        <h3 className="text-xl font-semibold text-white">Key Points</h3>
        <ul className="mt-3 space-y-2 text-sm text-slate-300">
          {keyPoints.length === 0 ? <li>No key points available.</li> : keyPoints.map((point, index) => <li key={index} className="rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2">{String(point)}</li>)}
        </ul>
      </div>
      <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/40">
        <h3 className="text-xl font-semibold text-white">Definitions</h3>
        <ul className="mt-3 space-y-2 text-sm text-slate-300">
          {importantDefinitions.length === 0 ? <li>No definitions extracted.</li> : importantDefinitions.map((item, index) => <li key={index} className="rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2">{String(item)}</li>)}
        </ul>
      </div>
    </div>
  );
}
