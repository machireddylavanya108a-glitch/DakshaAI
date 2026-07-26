export default function OptionButton({ option, selected, onSelect }) {
  return (
    <button
      onClick={() => onSelect(option)}
      className={`rounded-2xl border px-4 py-3 text-left transition ${selected ? 'border-emerald-400 bg-emerald-500/10 text-emerald-200' : 'border-slate-700 bg-slate-800/80 text-slate-200 hover:border-indigo-400'}`}
    >
      {option}
    </button>
  );
}
