export default function LoadingYouTube() {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-8 text-center shadow-2xl shadow-slate-950/40">
      <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-fuchsia-400/30 border-t-fuchsia-400" />
      <h3 className="text-xl font-semibold text-white">Loading your video learning experience</h3>
      <p className="mt-2 text-sm text-slate-400">Extracting transcript, chapters, and turning the content into a complete lesson package.</p>
    </div>
  );
}
