export default function QuizProgress({ currentIndex, totalQuestions, answeredCount }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-white/10 bg-slate-900/70 p-4 text-sm text-slate-300">
      <span>Question {currentIndex + 1} of {totalQuestions}</span>
      <span>{answeredCount} answered</span>
    </div>
  );
}
