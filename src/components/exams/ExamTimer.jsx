import { TimerReset, PauseCircle, PlayCircle, SendHorizonal } from 'lucide-react';

export default function ExamTimer({ timeLeft, isPaused, onPause, onResume, onSubmit }) {
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="rounded-[1rem] border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-slate-300">
      <div className="flex items-center gap-2 text-cyan-300"><TimerReset className="h-4 w-4" /> {minutes}:{seconds.toString().padStart(2, '0')}</div>
      <div className="mt-2 flex flex-wrap gap-2">
        {isPaused ? <button onClick={onResume} className="rounded-full border border-white/10 bg-slate-900/80 px-3 py-2"><PlayCircle className="mr-2 inline h-4 w-4" />Resume</button> : <button onClick={onPause} className="rounded-full border border-white/10 bg-slate-900/80 px-3 py-2"><PauseCircle className="mr-2 inline h-4 w-4" />Pause</button>}
        <button onClick={onSubmit} className="rounded-full bg-cyan-500 px-3 py-2 font-semibold text-slate-950"><SendHorizonal className="mr-2 inline h-4 w-4" />Submit</button>
      </div>
    </div>
  );
}
