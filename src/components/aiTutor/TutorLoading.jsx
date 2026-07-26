export default function TutorLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
      <div className="rounded-[2rem] border border-indigo-500/20 bg-slate-900/80 p-8 text-center shadow-2xl shadow-indigo-950/30">
        <p className="text-sm uppercase tracking-[0.35em] text-indigo-300">Loading AI Tutor</p>
        <h2 className="mt-3 text-2xl font-semibold">Preparing your personalized tutor experience...</h2>
      </div>
    </div>
  );
}
