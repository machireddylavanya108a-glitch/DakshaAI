export default function LoadingFlashcards() {
  return (
    <div className="rounded-3xl border border-indigo-500/20 bg-slate-900/80 p-8 text-center shadow-2xl shadow-indigo-950/30">
      <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-indigo-400/30 border-t-indigo-400" />
      <h3 className="text-xl font-semibold text-white">Generating flashcards</h3>
      <p className="mt-2 text-sm text-slate-400">Building a polished deck with definitions, examples, and study tags.</p>
    </div>
  );
}
