import { useState } from 'react';
import { MessageSquare, Code2, Calculator, PenTool } from 'lucide-react';

export default function PracticeSession({ question, onSubmit }) {
  const [answer, setAnswer] = useState('');

  if (!question) {
    return <div className="rounded-[1.2rem] border border-white/10 bg-slate-950/70 p-6 text-sm text-slate-400">No active question yet. Start a practice session to begin.</div>;
  }

  return (
    <div className="rounded-[1.2rem] border border-white/10 bg-slate-950/70 p-5">
      <div className="flex items-center gap-2 text-cyan-300"><MessageSquare className="h-4 w-4" /> Current Question</div>
      <div className="mt-4 rounded-[1rem] border border-white/10 bg-slate-900/80 p-4">
        <p className="text-sm uppercase tracking-[0.25em] text-cyan-400">{question.type}</p>
        <p className="mt-2 text-lg font-semibold text-white">{question.prompt}</p>
        {question.options ? <div className="mt-4 grid gap-2">{question.options.map((option) => <div key={option} className="rounded-[0.9rem] border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-slate-300">{option}</div>)}</div> : null}
      </div>
      <textarea value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder="Type your answer or reasoning here..." className="mt-4 min-h-28 w-full rounded-[1rem] border border-white/10 bg-slate-900/80 px-3 py-3 text-sm text-slate-200 outline-none" />
      <div className="mt-4 flex flex-wrap gap-2">
        <button onClick={() => { onSubmit(answer); setAnswer(''); }} className="rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950">Submit Answer</button>
        <button className="rounded-full border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-slate-300"><Code2 className="mr-2 inline h-4 w-4" />Code</button>
        <button className="rounded-full border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-slate-300"><Calculator className="mr-2 inline h-4 w-4" />Math</button>
        <button className="rounded-full border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-slate-300"><PenTool className="mr-2 inline h-4 w-4" />Draw</button>
      </div>
    </div>
  );
}
