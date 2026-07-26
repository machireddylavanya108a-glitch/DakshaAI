import { FileText, Sparkles, BrainCircuit } from 'lucide-react';

export default function NotesDashboard({ form, onChange, onGenerate, onSave }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-cyan-300"><BrainCircuit className="h-4 w-4" /> Build Notes</div>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="rounded-[1rem] border border-white/10 bg-slate-950/70 p-3 text-sm text-slate-300">
          <span className="mb-2 block text-cyan-200">Topic</span>
          <input value={form.topic} onChange={(event) => onChange((prev) => ({ ...prev, topic: event.target.value }))} className="w-full rounded-[0.8rem] border border-white/10 bg-slate-900 px-3 py-2 text-slate-100 outline-none" />
        </label>
        <label className="rounded-[1rem] border border-white/10 bg-slate-950/70 p-3 text-sm text-slate-300">
          <span className="mb-2 block text-cyan-200">Source Type</span>
          <input value={form.sourceType} onChange={(event) => onChange((prev) => ({ ...prev, sourceType: event.target.value }))} className="w-full rounded-[0.8rem] border border-white/10 bg-slate-900 px-3 py-2 text-slate-100 outline-none" />
        </label>
        <label className="rounded-[1rem] border border-white/10 bg-slate-950/70 p-3 text-sm text-slate-300">
          <span className="mb-2 block text-cyan-200">Source Name</span>
          <input value={form.sourceName} onChange={(event) => onChange((prev) => ({ ...prev, sourceName: event.target.value }))} className="w-full rounded-[0.8rem] border border-white/10 bg-slate-900 px-3 py-2 text-slate-100 outline-none" />
        </label>
        <label className="rounded-[1rem] border border-white/10 bg-slate-950/70 p-3 text-sm text-slate-300">
          <span className="mb-2 block text-cyan-200">Format</span>
          <select value={form.format} onChange={(event) => onChange((prev) => ({ ...prev, format: event.target.value }))} className="w-full rounded-[0.8rem] border border-white/10 bg-slate-900 px-3 py-2 text-slate-100 outline-none">
            {['Short Notes', 'Detailed Notes', 'Exam Notes', 'Revision Notes', 'Cheat Sheet', 'Bullet Notes', 'Mind Notes', 'Flash Notes', 'One Page Summary', 'Topic Summary', 'Chapter Summary', 'Book Summary', 'Research Summary'].map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <label className="rounded-[1rem] border border-white/10 bg-slate-950/70 p-3 text-sm text-slate-300">
          <span className="mb-2 block text-cyan-200">Language</span>
          <input value={form.language} onChange={(event) => onChange((prev) => ({ ...prev, language: event.target.value }))} className="w-full rounded-[0.8rem] border border-white/10 bg-slate-900 px-3 py-2 text-slate-100 outline-none" />
        </label>
        <label className="rounded-[1rem] border border-white/10 bg-slate-950/70 p-3 text-sm text-slate-300">
          <span className="mb-2 block text-cyan-200">Folder</span>
          <input value={form.folder} onChange={(event) => onChange((prev) => ({ ...prev, folder: event.target.value }))} className="w-full rounded-[0.8rem] border border-white/10 bg-slate-900 px-3 py-2 text-slate-100 outline-none" />
        </label>
      </div>
      <div className="flex flex-wrap gap-3">
        <button onClick={onGenerate} className="rounded-full bg-cyan-500 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-400">Generate Notes</button>
        <button onClick={onSave} className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 text-sm font-semibold text-cyan-100">Save Notes</button>
      </div>
    </div>
  );
}
