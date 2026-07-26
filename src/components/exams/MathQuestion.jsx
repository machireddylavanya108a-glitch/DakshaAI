export default function MathQuestion({ question, value, onChange }) {
  return (
    <input value={value || ''} onChange={(event) => onChange(event.target.value)} className="w-full rounded-[1rem] border border-white/10 bg-slate-900/80 px-3 py-3 text-sm text-slate-200 outline-none" placeholder="Enter the numerical answer..." />
  );
}
