export default function SafetyPanel({ lab }) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/75 p-5">
      <div className="flex items-center gap-2 text-cyan-300"><span className="text-lg">🛡️</span> Safety & Mistakes</div>
      <div className="mt-4 space-y-3 text-sm text-slate-400">
        <div className="rounded-[1rem] border border-white/10 bg-slate-950/70 p-3"><strong className="text-white">Safety:</strong> {lab.safety.join(' ')}</div>
        <div className="rounded-[1rem] border border-white/10 bg-slate-950/70 p-3"><strong className="text-white">Common mistakes:</strong> {lab.mistakes.join(' · ')}</div>
        <div className="rounded-[1rem] border border-white/10 bg-slate-950/70 p-3"><strong className="text-white">Real-world applications:</strong> {lab.applications.join(' ')}</div>
      </div>
    </div>
  );
}
