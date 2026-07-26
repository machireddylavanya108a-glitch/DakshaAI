export default function ResultPanel({ lab, results, score, onComplete }) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-slate-900/75 p-5 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
      <div className="flex items-center gap-2 text-cyan-300"><span className="text-lg">📊</span> Results & Conclusion</div>
      <div className="mt-4 rounded-[1.2rem] border border-white/10 bg-slate-950/70 p-4 text-sm text-slate-400">
        <p><strong className="text-white">Results:</strong> {results || lab.results}</p>
        <p className="mt-2"><strong className="text-white">Conclusion:</strong> {lab.conclusion}</p>
        <p className="mt-2"><strong className="text-white">Score:</strong> {score || lab.score}%</p>
      </div>
      <button onClick={onComplete} className="mt-4 rounded-full bg-emerald-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400">
        Complete Lab
      </button>
    </div>
  );
}
