import { Image as ImageIcon } from 'lucide-react';

export default function ImageTool() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-amber-300">
        <ImageIcon className="h-4 w-4" /> Images & media
      </div>
      <div className="rounded-2xl border border-white/10 bg-slate-800/60 p-3 text-sm text-slate-300">
        Drag in screenshots, diagrams, photos, logos, and visual references for rich boards.
      </div>
    </div>
  );
}
