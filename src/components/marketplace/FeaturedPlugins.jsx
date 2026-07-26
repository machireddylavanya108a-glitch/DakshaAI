export default function FeaturedPlugins() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {['Coding Agent', 'Vision OCR', 'Glass Classroom'].map((item) => (
        <div key={item} className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
          <p className="text-sm text-cyan-300">Featured</p>
          <h3 className="mt-2 text-lg font-semibold">{item}</h3>
          <p className="mt-2 text-sm text-slate-400">Used by learners, educators, and enterprise teams across the platform.</p>
        </div>
      ))}
    </div>
  );
}
