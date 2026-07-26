import { BookOpen, Zap, TimerReset, BrainCircuit } from 'lucide-react';

export default function ExamHome({ form, onChange, onStart }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-cyan-300"><BrainCircuit className="h-4 w-4" /> Configure Examination</div>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="rounded-[1rem] border border-white/10 bg-slate-950/70 p-3 text-sm text-slate-300">
          <span className="mb-2 block text-cyan-200">Subject</span>
          <input value={form.subject} onChange={(event) => onChange((prev) => ({ ...prev, subject: event.target.value }))} className="w-full rounded-[0.8rem] border border-white/10 bg-slate-900 px-3 py-2 text-slate-100 outline-none" />
        </label>
        <label className="rounded-[1rem] border border-white/10 bg-slate-950/70 p-3 text-sm text-slate-300">
          <span className="mb-2 block text-cyan-200">Examination Type</span>
          <select value={form.examType} onChange={(event) => onChange((prev) => ({ ...prev, examType: event.target.value }))} className="w-full rounded-[0.8rem] border border-white/10 bg-slate-900 px-3 py-2 text-slate-100 outline-none">
            {['Practice Exam', 'Mock Test', 'Timed Test', 'Final Examination', 'Adaptive Examination', 'Interview Assessment', 'Placement Test', 'Custom Test', 'AI Challenge Mode'].map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <label className="rounded-[1rem] border border-white/10 bg-slate-950/70 p-3 text-sm text-slate-300">
          <span className="mb-2 block text-cyan-200">Difficulty</span>
          <select value={form.difficulty} onChange={(event) => onChange((prev) => ({ ...prev, difficulty: event.target.value }))} className="w-full rounded-[0.8rem] border border-white/10 bg-slate-900 px-3 py-2 text-slate-100 outline-none">
            {['Beginner', 'Intermediate', 'Advanced', 'Expert'].map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <label className="rounded-[1rem] border border-white/10 bg-slate-950/70 p-3 text-sm text-slate-300">
          <span className="mb-2 block text-cyan-200">Mode</span>
          <select value={form.mode} onChange={(event) => onChange((prev) => ({ ...prev, mode: event.target.value }))} className="w-full rounded-[0.8rem] border border-white/10 bg-slate-900 px-3 py-2 text-slate-100 outline-none">
            {['Practice Exam', 'Mock Test', 'Timed Test', 'Final Examination', 'Adaptive Examination', 'Interview Assessment', 'Placement Test', 'Custom Test', 'AI Challenge Mode'].map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <label className="rounded-[1rem] border border-white/10 bg-slate-950/70 p-3 text-sm text-slate-300 md:col-span-2">
          <span className="mb-2 block text-cyan-200">Duration (minutes)</span>
          <input type="number" value={form.duration} onChange={(event) => onChange((prev) => ({ ...prev, duration: Number(event.target.value) }))} className="w-full rounded-[0.8rem] border border-white/10 bg-slate-900 px-3 py-2 text-slate-100 outline-none" />
        </label>
      </div>
      <div className="flex flex-wrap gap-3">
        <button onClick={onStart} className="rounded-full bg-cyan-500 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-400">Create Examination</button>
        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-slate-400"><TimerReset className="h-4 w-4" /> Timer, warnings, and auto-submit enabled</div>
      </div>
    </div>
  );
}
