import { ChevronLeft, ChevronRight, PlayCircle, PauseCircle, SendHorizonal } from 'lucide-react';
import QuestionRenderer from './QuestionRenderer';
import ExamTimer from './ExamTimer';

export default function ExamSession({ exam, currentIndex, currentQuestion, answer, onAnswerChange, onNext, onPrevious, onPause, onResume, onSubmit, timeLeft, isPaused, progressPercent }) {
  if (!currentQuestion) {
    return <div className="rounded-[1rem] border border-white/10 bg-slate-950/70 p-4 text-sm text-slate-400">The exam session will appear once the test is generated.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="text-cyan-300">Live Examination</div>
          <div className="text-sm text-slate-400">Question {currentIndex + 1} of {exam.questions.length}</div>
        </div>
        <ExamTimer timeLeft={timeLeft} isPaused={isPaused} onPause={onPause} onResume={onResume} onSubmit={onSubmit} />
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
        <div className="h-full rounded-full bg-cyan-500" style={{ width: `${progressPercent}%` }} />
      </div>
      <div className="rounded-[1rem] border border-white/10 bg-slate-950/70 p-4">
        <p className="text-sm uppercase tracking-[0.25em] text-cyan-400">{currentQuestion.type}</p>
        <p className="mt-2 text-lg font-semibold text-white">{currentQuestion.prompt}</p>
        <div className="mt-4">
          <QuestionRenderer question={currentQuestion} value={answer} onChange={onAnswerChange} />
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        <button onClick={onPrevious} className="rounded-full border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-slate-300"><ChevronLeft className="mr-2 inline h-4 w-4" />Previous</button>
        <button onClick={onNext} className="rounded-full border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-slate-300">Next<ChevronRight className="ml-2 inline h-4 w-4" /></button>
        <button onClick={onSubmit} className="rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950">Submit Exam</button>
      </div>
    </div>
  );
}
