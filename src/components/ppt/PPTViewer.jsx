export default function PPTViewer({ title, slides = [], activeSlide, onSelectSlide, searchTerm, onSearch }) {
  const visibleSlides = slides.filter((slide) => {
    if (!searchTerm.trim()) return true;
    const haystack = `${slide.title} ${slide.text?.join(' ') || ''}`.toLowerCase();
    return haystack.includes(searchTerm.toLowerCase());
  });

  return (
    <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/40">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.35em] text-cyan-300">Presentation Viewer</p>
          <h3 className="text-xl font-semibold text-white">{title || 'Uploaded presentation'}</h3>
        </div>
        <input
          value={searchTerm}
          onChange={(event) => onSearch?.(event.target.value)}
          placeholder="Search slides"
          className="rounded-2xl border border-slate-700 bg-slate-800/80 px-4 py-2 text-sm text-white outline-none"
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {visibleSlides.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-sm text-slate-500 md:col-span-2">No matching slides found.</div>
        ) : visibleSlides.map((slide, index) => (
          <button key={slide.id || index} onClick={() => onSelectSlide?.(index)} className={`rounded-[1.5rem] border p-4 text-left transition ${activeSlide === index ? 'border-cyan-400 bg-cyan-500/10' : 'border-slate-800 bg-slate-950/70 hover:border-slate-700'}`}>
            <p className="text-sm text-cyan-300">Slide {index + 1}</p>
            <h4 className="mt-2 font-semibold text-white">{slide.title}</h4>
            <p className="mt-2 text-sm text-slate-400">{slide.bullets?.slice(0, 2).join(' • ') || slide.text?.[0] || 'No content detected'}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
