export default function LabSearch({ value, onChange, onGenerate }) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <p className="text-sm uppercase tracking-[0.25em] text-cyan-400">Search any experiment</p>
        <h2 className="mt-2 text-xl font-semibold text-white">Type anything and generate a practical lab instantly</h2>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Try: DNA Extraction, Sorting Algorithm, Neural Network..."
          className="rounded-full border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-slate-200 outline-none"
        />
        <button onClick={onGenerate} className="rounded-full bg-cyan-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400">
          Generate Lab
        </button>
      </div>
    </div>
  );
}
