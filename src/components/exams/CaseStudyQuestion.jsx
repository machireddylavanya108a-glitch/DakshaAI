export default function CaseStudyQuestion({ question, value, onChange }) {
  return (
    <textarea value={value || ''} onChange={(event) => onChange(event.target.value)} className="min-h-36 w-full rounded-[1rem] border border-white/10 bg-slate-900/80 px-3 py-3 text-sm text-slate-200 outline-none" placeholder="Analyse the scenario and explain your decision-making process..." />
  );
}
