export default function TranscriptViewer({ transcript = [], activeTimestamp, onTimestampSelect }) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/40">
      <h3 className="text-xl font-semibold text-white">Transcript</h3>
      <div className="mt-4 space-y-3">
        {transcript.length === 0 ? <p className="text-sm text-slate-500">No transcript available right now.</p> : transcript.map((entry, index) => (
          <button key={`${entry.timestamp || index}-${index}`} onClick={() => onTimestampSelect?.(entry.timestamp)} className={`w-full rounded-2xl border p-4 text-left transition ${activeTimestamp === entry.timestamp ? 'border-fuchsia-400 bg-fuchsia-500/10' : 'border-slate-800 bg-slate-950/70 hover:border-slate-700'}`}>
            <div className="flex items-center justify-between text-sm text-slate-400">
              <span>{entry.timestamp || `Section ${index + 1}`}</span>
              <span>{entry.title || 'Excerpt'}</span>
            </div>
            <p className="mt-2 text-sm text-slate-300">{entry.text || ''}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
