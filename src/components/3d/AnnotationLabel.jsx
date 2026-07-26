export default function AnnotationLabel({ label, onClick, active = false }) {
  return (
    <button onClick={onClick} className={`rounded-full border px-3 py-2 text-sm transition ${active ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100' : 'border-white/10 bg-slate-950/70 text-slate-200'}`}>
      {label}
    </button>
  );
}
