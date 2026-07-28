export default function LabelSystem({ labels = [] }) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {labels.map((label) => (
        <span key={label} className="rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1 text-xs text-slate-300">
          {label}
        </span>
      ))}
    </div>
  );
}
