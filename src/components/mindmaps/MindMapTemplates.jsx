import { LayoutTemplate } from 'lucide-react';

const templates = [
  { name: 'Classic Mind Map', theme: 'Aurora' },
  { name: 'Concept Map', theme: 'Nebula' },
  { name: 'Flowchart', theme: 'Ocean' },
  { name: 'Knowledge Graph', theme: 'Midnight' },
  { name: 'Timeline', theme: 'Sunset' }
];

export default function MindMapTemplates({ onApply }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-amber-300">
        <LayoutTemplate className="h-4 w-4" /> Templates
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        {templates.map((template) => (
          <button key={template.name} onClick={() => onApply(template)} className="rounded-2xl border border-white/10 bg-slate-800/60 px-3 py-3 text-left text-sm text-slate-200 hover:border-violet-400">
            <div className="font-medium">{template.name}</div>
            <div className="mt-1 text-xs text-slate-400">Theme: {template.theme}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
