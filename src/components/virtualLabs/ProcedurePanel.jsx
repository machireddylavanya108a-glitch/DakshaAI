export default function ProcedurePanel({ lab }) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/75 p-5">
      <div className="flex items-center gap-2 text-cyan-300"><span className="text-lg">🧪</span> Procedure</div>
      <ol className="mt-4 space-y-2 text-sm text-slate-400">
        {lab.procedure.map((item) => <li key={item} className="rounded-[1rem] border border-white/10 bg-slate-950/70 p-3">{item}</li>)}
      </ol>
    </div>
  );
}
