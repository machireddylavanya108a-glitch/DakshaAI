import { Award, Sparkles, BadgeCheck } from 'lucide-react';

export default function CertificateDashboard({ form, onChange, onGenerate, onSave }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-cyan-300"><Award className="h-4 w-4" /> Create Certificate</div>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="rounded-[1rem] border border-white/10 bg-slate-950/70 p-3 text-sm text-slate-300">
          <span className="mb-2 block text-cyan-200">Student Name</span>
          <input value={form.studentName} onChange={(event) => onChange((prev) => ({ ...prev, studentName: event.target.value }))} className="w-full rounded-[0.8rem] border border-white/10 bg-slate-900 px-3 py-2 text-slate-100 outline-none" />
        </label>
        <label className="rounded-[1rem] border border-white/10 bg-slate-950/70 p-3 text-sm text-slate-300">
          <span className="mb-2 block text-cyan-200">Course Name</span>
          <input value={form.courseName} onChange={(event) => onChange((prev) => ({ ...prev, courseName: event.target.value }))} className="w-full rounded-[0.8rem] border border-white/10 bg-slate-900 px-3 py-2 text-slate-100 outline-none" />
        </label>
        <label className="rounded-[1rem] border border-white/10 bg-slate-950/70 p-3 text-sm text-slate-300">
          <span className="mb-2 block text-cyan-200">Duration</span>
          <input value={form.duration} onChange={(event) => onChange((prev) => ({ ...prev, duration: event.target.value }))} className="w-full rounded-[0.8rem] border border-white/10 bg-slate-900 px-3 py-2 text-slate-100 outline-none" />
        </label>
        <label className="rounded-[1rem] border border-white/10 bg-slate-950/70 p-3 text-sm text-slate-300">
          <span className="mb-2 block text-cyan-200">Score</span>
          <input type="number" value={form.score} onChange={(event) => onChange((prev) => ({ ...prev, score: Number(event.target.value) }))} className="w-full rounded-[0.8rem] border border-white/10 bg-slate-900 px-3 py-2 text-slate-100 outline-none" />
        </label>
        <label className="rounded-[1rem] border border-white/10 bg-slate-950/70 p-3 text-sm text-slate-300">
          <span className="mb-2 block text-cyan-200">Skills</span>
          <input value={form.skills?.join(', ')} onChange={(event) => onChange((prev) => ({ ...prev, skills: event.target.value.split(',').map((item) => item.trim()).filter(Boolean) }))} className="w-full rounded-[0.8rem] border border-white/10 bg-slate-900 px-3 py-2 text-slate-100 outline-none" />
        </label>
        <label className="rounded-[1rem] border border-white/10 bg-slate-950/70 p-3 text-sm text-slate-300">
          <span className="mb-2 block text-cyan-200">Template</span>
          <select value={form.template} onChange={(event) => onChange((prev) => ({ ...prev, template: event.target.value }))} className="w-full rounded-[0.8rem] border border-white/10 bg-slate-900 px-3 py-2 text-slate-100 outline-none">
            {['Modern', 'Premium', 'Minimal', 'Corporate', 'Academic', 'Professional', 'Luxury', 'Dark Theme', 'Glassmorphism'].map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
      </div>
      <div className="flex flex-wrap gap-3">
        <button onClick={onGenerate} className="rounded-full bg-cyan-500 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-400">Generate Certificate</button>
        <button onClick={onSave} className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 text-sm font-semibold text-cyan-100">Save Certificate</button>
      </div>
    </div>
  );
}
