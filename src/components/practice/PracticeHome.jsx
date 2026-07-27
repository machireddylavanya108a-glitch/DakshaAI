import { Search } from 'lucide-react';

const levelOptions = ['Beginner', 'Easy', 'Medium', 'Hard', 'Expert', 'Adaptive'];

export default function PracticeHome({
  topic,
  difficulty,
  profile,
  onTopicChange,
  onDifficultyChange,
  onProfileChange,
  onStart
}) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm uppercase tracking-[0.25em] text-cyan-400">Practice Hub</p>
        <h2 className="mt-2 text-xl font-semibold text-white">Auto-generate personalized post-lesson practice</h2>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <input value={topic} onChange={(event) => onTopicChange(event.target.value)} placeholder="Try: AI, Finance, Interview, Physics..." className="rounded-full border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-slate-200 outline-none" />
        <select value={difficulty} onChange={(event) => onDifficultyChange(event.target.value)} className="rounded-full border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-slate-200 outline-none">
          {levelOptions.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <select value={profile.skillLevel} onChange={(event) => onProfileChange({ ...profile, skillLevel: event.target.value })} className="rounded-full border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-slate-200 outline-none">
          <option value="beginner">Skill: Beginner</option>
          <option value="intermediate">Skill: Intermediate</option>
          <option value="advanced">Skill: Advanced</option>
        </select>
        <select value={profile.ageGroup} onChange={(event) => onProfileChange({ ...profile, ageGroup: event.target.value })} className="rounded-full border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-slate-200 outline-none">
          <option value="child">Age: Child</option>
          <option value="teen">Age: Teen</option>
          <option value="adult">Age: Adult</option>
        </select>
        <select value={profile.learningSpeed} onChange={(event) => onProfileChange({ ...profile, learningSpeed: event.target.value })} className="rounded-full border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-slate-200 outline-none">
          <option value="slow">Speed: Slow</option>
          <option value="normal">Speed: Normal</option>
          <option value="fast">Speed: Fast</option>
        </select>
        <button onClick={onStart} className="rounded-full bg-cyan-500 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-400">Generate Practice</button>
      </div>
    </div>
  );
}
