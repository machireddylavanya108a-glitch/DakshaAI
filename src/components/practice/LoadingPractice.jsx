export default function LoadingPractice() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.16),_transparent_35%),linear-gradient(135deg,_#020617_0%,_#0f172a_45%,_#111827_100%)] px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl rounded-[2rem] border border-white/10 bg-slate-900/80 p-8 text-center shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-cyan-500 border-t-transparent" />
        <h2 className="mt-4 text-2xl font-semibold text-white">Preparing your practice engine...</h2>
        <p className="mt-2 text-sm text-slate-400">Generating adaptive questions and analytics for your next challenge.</p>
      </div>
    </div>
  );
}
