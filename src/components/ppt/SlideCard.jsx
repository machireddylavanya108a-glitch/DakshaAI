export default function SlideCard({ slide, index }) {
  if (!slide) return null;

  return (
    <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/40">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-[0.35em] text-cyan-300">Active Slide</p>
          <h3 className="text-xl font-semibold text-white">{slide.title || `Slide ${index + 1}`}</h3>
        </div>
        <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-300">#{index + 1}</div>
      </div>
      <div className="space-y-3">
        {slide.bullets?.length ? slide.bullets.map((bullet) => <div key={bullet} className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-sm text-slate-300">{bullet}</div>) : null}
        {slide.text?.length ? slide.text.map((text) => <p key={text} className="text-sm leading-7 text-slate-400">{text}</p>) : null}
      </div>
    </div>
  );
}
