import { Search } from 'lucide-react';

export default function PracticeHome({ topic, difficulty, onTopicChange, onDifficultyChange, onStart }) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <p className="text-sm uppercase tracking-[0.25em] text-cyan-400">Practice Hub</p>
        <h2 className="mt-2 text-xl font-semibold text-white">Generate a new challenge for any topic</h2>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input value={topic} onChange={(event) => onTopicChange(event.target.value)} placeholder="Try: AI, Finance, Interview, Physics..." className="rounded-full border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-slate-200 outline-none" />
        <select value={difficulty} onChange={(event) => onDifficultyChange(event.target.value)} className="rounded-full border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-slate-200 outline-none">
          <option>Beginner</option>
          <option>Intermediate</option>
          <option>Advanced</option>
          <option>Expert</option>
        </select>
        <button onClick={onStart} className="rounded-full bg-cyan-500 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-400">Start Practice</button>
      </div>
    </div>
  );
}
