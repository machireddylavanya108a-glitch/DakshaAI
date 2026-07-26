export default function CodingQuestion({ question, value, onChange }) {
  return (
    <textarea value={value || ''} onChange={(event) => onChange(event.target.value)} className="min-h-40 w-full rounded-[1rem] border border-white/10 bg-slate-900/80 px-3 py-3 font-mono text-sm text-slate-200 outline-none" placeholder="Write your solution here..." />
  );
}
