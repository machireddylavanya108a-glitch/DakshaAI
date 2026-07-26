export default function SlideNavigator({ slides = [], activeSlide, onSelectSlide }) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/40">
      <h3 className="text-xl font-semibold text-white">Slide List</h3>
      <div className="mt-4 space-y-2">
        {slides.map((slide, index) => (
          <button key={slide.id || index} onClick={() => onSelectSlide?.(index)} className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm transition ${activeSlide === index ? 'border-cyan-400 bg-cyan-500/10 text-cyan-200' : 'border-slate-800 bg-slate-950/70 text-slate-300 hover:border-slate-700'}`}>
            <span>{slide.title || `Slide ${index + 1}`}</span>
            <span className="text-xs uppercase tracking-[0.2em] text-slate-500">{index + 1}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
