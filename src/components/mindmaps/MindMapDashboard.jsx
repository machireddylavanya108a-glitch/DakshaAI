import { Sparkles, Languages, Layers3, BookOpen, FileText, Mic, Camera, BrainCircuit } from 'lucide-react';

const sourceTypes = ['PDF', 'DOCX', 'PPT', 'TXT', 'Video', 'Audio', 'Image', 'Website', 'Code', 'Any Source'];
const mapTypes = ['Classic Mind Map', 'Concept Map', 'Flowchart', 'Knowledge Graph', 'Tree Diagram', 'Hierarchy Map', 'Timeline', 'Process Diagram', 'Decision Tree', 'Research Map'];
const themes = ['Aurora', 'Nebula', 'Ocean', 'Sunset', 'Midnight'];

export default function MindMapDashboard({ form, onChange, onGenerate, onSave }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium text-violet-300">
        <Sparkles className="h-4 w-4" /> Generation controls
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm text-slate-300">
          <span className="mb-2 block">Central topic</span>
          <input value={form.topic || ''} onChange={(event) => onChange((prev) => ({ ...prev, topic: event.target.value }))} className="w-full rounded-2xl border border-white/10 bg-slate-800/80 px-3 py-2 text-white outline-none" placeholder="Enter a topic or question" />
        </label>

        <label className="text-sm text-slate-300">
          <span className="mb-2 block">Source type</span>
          <select value={form.sourceType || 'Any Source'} onChange={(event) => onChange((prev) => ({ ...prev, sourceType: event.target.value }))} className="w-full rounded-2xl border border-white/10 bg-slate-800/80 px-3 py-2 text-white outline-none">
            {sourceTypes.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
        </label>

        <label className="text-sm text-slate-300">
          <span className="mb-2 block">Source name</span>
          <input value={form.sourceName || ''} onChange={(event) => onChange((prev) => ({ ...prev, sourceName: event.target.value }))} className="w-full rounded-2xl border border-white/10 bg-slate-800/80 px-3 py-2 text-white outline-none" placeholder="PDF, notes, code, lecture, etc." />
        </label>

        <label className="text-sm text-slate-300">
          <span className="mb-2 block">Map type</span>
          <select value={form.mapType || 'Classic Mind Map'} onChange={(event) => onChange((prev) => ({ ...prev, mapType: event.target.value }))} className="w-full rounded-2xl border border-white/10 bg-slate-800/80 px-3 py-2 text-white outline-none">
            {mapTypes.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
        </label>

        <label className="text-sm text-slate-300">
          <span className="mb-2 block">Language</span>
          <select value={form.language || 'English'} onChange={(event) => onChange((prev) => ({ ...prev, language: event.target.value }))} className="w-full rounded-2xl border border-white/10 bg-slate-800/80 px-3 py-2 text-white outline-none">
            <option value="English">English</option>
            <option value="Hindi">Hindi</option>
            <option value="Spanish">Spanish</option>
            <option value="French">French</option>
            <option value="Arabic">Arabic</option>
            <option value="Chinese">Chinese</option>
          </select>
        </label>

        <label className="text-sm text-slate-300">
          <span className="mb-2 block">Theme</span>
          <select value={form.theme || 'Aurora'} onChange={(event) => onChange((prev) => ({ ...prev, theme: event.target.value }))} className="w-full rounded-2xl border border-white/10 bg-slate-800/80 px-3 py-2 text-white outline-none">
            {themes.map((theme) => <option key={theme} value={theme}>{theme}</option>)}
          </select>
        </label>
      </div>

      <div className="flex flex-wrap gap-3">
        <button onClick={onGenerate} className="rounded-2xl bg-gradient-to-r from-violet-500 to-cyan-400 px-4 py-2 text-sm font-semibold text-white">Generate mind map</button>
        <button onClick={onSave} className="rounded-2xl border border-white/10 bg-slate-800/80 px-4 py-2 text-sm text-slate-200">Save map</button>
      </div>

      <div className="grid gap-3 rounded-2xl border border-white/10 bg-slate-800/60 p-3 text-sm text-slate-400 md:grid-cols-4">
        <div className="flex items-center gap-2"><BookOpen className="h-4 w-4 text-cyan-300" /> Documents</div>
        <div className="flex items-center gap-2"><FileText className="h-4 w-4 text-emerald-300" /> Notes</div>
        <div className="flex items-center gap-2"><Mic className="h-4 w-4 text-amber-300" /> Audio</div>
        <div className="flex items-center gap-2"><Camera className="h-4 w-4 text-pink-300" /> Images</div>
      </div>
    </div>
  );
}
