export default function ImageViewer({ images = [] }) {
  if (!images.length) return null;

  return (
    <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/40">
      <h3 className="text-xl font-semibold text-white">Images & Visuals</h3>
      <div className="mt-4 space-y-3">
        {images.map((image, index) => (
          <div key={`${image.alt || 'image'}-${index}`} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
            <p className="text-sm font-semibold text-white">{image.alt || `Image ${index + 1}`}</p>
            <p className="mt-2 text-sm text-slate-400">{image.description || 'Visual element extracted from the presentation.'}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
