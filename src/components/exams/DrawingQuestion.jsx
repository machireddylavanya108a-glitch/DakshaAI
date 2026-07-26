export default function DrawingQuestion({ question, value, onChange }) {
  return (
    <div className="space-y-3">
      <textarea value={value || ''} onChange={(event) => onChange(event.target.value)} className="min-h-28 w-full rounded-[1rem] border border-white/10 bg-slate-900/80 px-3 py-3 text-sm text-slate-200 outline-none" placeholder="Describe the diagram, flow, or concept map here..." />
      <div className="rounded-[1rem] border border-dashed border-white/10 bg-slate-950/70 p-6 text-center text-sm text-slate-400">Sketching canvas placeholder for diagram and drawing prompts.</div>
    </div>
  );
}
