export default function YouTubePlayer({ videoUrl, title, onTimestampSelect }) {
  const embedUrl = videoUrl ? videoUrl.replace('watch?v=', 'embed/').replace('youtu.be/', 'www.youtube.com/embed/') : '';
  return (
    <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/40">
      <div className="mb-4">
        <p className="text-sm uppercase tracking-[0.35em] text-fuchsia-300">Video Player</p>
        <h3 className="text-xl font-semibold text-white">{title || 'YouTube video'}</h3>
      </div>
      {embedUrl ? (
        <div className="overflow-hidden rounded-[1.5rem] border border-slate-800">
          <iframe title={title || 'YouTube player'} src={embedUrl} className="aspect-video w-full" allowFullScreen />
        </div>
      ) : (
        <div className="flex min-h-[280px] items-center justify-center rounded-[1.5rem] border border-slate-800 bg-slate-950/70 text-sm text-slate-500">Paste a YouTube URL to load the video.</div>
      )}
      <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-sm text-slate-400">
        Tip: Use the timestamp controls to jump to sections or bookmark important moments.
      </div>
    </div>
  );
}
