export default function ModelSelector({ models, selectedModelId, onSelect }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {models.map((model) => (
        <button
          key={model.id}
          onClick={() => onSelect(model.id)}
          className={`rounded-[1.2rem] border p-3 text-left transition ${selectedModelId === model.id ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100' : 'border-white/10 bg-slate-950/70 text-slate-200'}`}
        >
          <p className="font-semibold">{model.name}</p>
          <p className="mt-1 text-sm text-slate-400">{model.category}</p>
        </button>
      ))}
    </div>
  );
}
