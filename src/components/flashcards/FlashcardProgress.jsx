export default function FlashcardProgress({ progress }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-4 text-sm text-slate-300">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span>Learned: {progress.cardsLearned}</span>
        <span>Remaining: {progress.cardsRemaining}</span>
        <span>Accuracy: {progress.accuracy}%</span>
        <span>Study Time: {progress.studyTime}</span>
        <span>Completion: {progress.completionPercentage}%</span>
      </div>
    </div>
  );
}
