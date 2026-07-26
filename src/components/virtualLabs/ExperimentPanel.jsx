export default function ExperimentPanel({ lab }) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/75 p-5">
      <div className="flex items-center gap-2 text-cyan-300"><span className="text-lg">⚙️</span> Experiment Setup</div>
      <div className="mt-4 space-y-3 text-sm text-slate-400">
        <div className="rounded-[1rem] border border-white/10 bg-slate-950/70 p-3"><strong className="text-white">Objective:</strong> {lab.objective}</div>
        <div className="rounded-[1rem] border border-white/10 bg-slate-950/70 p-3"><strong className="text-white">Materials:</strong> {lab.materials.join(' · ')}</div>
        <div className="rounded-[1rem] border border-white/10 bg-slate-950/70 p-3"><strong className="text-white">Observations:</strong> {lab.observations.join(' ')}</div>
        <div className="rounded-[1rem] border border-white/10 bg-slate-950/70 p-3"><strong className="text-white">Calculations:</strong> {lab.calculations.join(' ')}</div>
      </div>
    </div>
  );
}
