const categories = ['All', 'AI Agent', 'OCR', 'Theme', 'Course Pack'];

export default function Categories({ onSelect }) {
  return (
    <div className="flex flex-wrap gap-3">
      {categories.map((category) => (
        <button key={category} onClick={() => onSelect(category)} className="rounded-full border border-slate-700 bg-slate-900/70 px-4 py-2 text-sm text-slate-300 transition hover:border-cyan-500/40 hover:text-cyan-200">
          {category}
        </button>
      ))}
    </div>
  );
}
