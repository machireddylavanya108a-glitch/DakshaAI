import { Sparkles } from 'lucide-react';

export default function WhiteboardCanvas({ board }) {
  if (!board) {
    return <div className="rounded-[2rem] border border-dashed border-white/10 p-8 text-center text-sm text-slate-400">Create a whiteboard to start visualizing ideas.</div>;
  }

  return (
    <div className="rounded-[2rem] border border-white/10 bg-slate-950/60 p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-medium text-cyan-300">
        <Sparkles className="h-4 w-4" /> Live board preview
      </div>
      <div className="relative min-h-[320px] overflow-hidden rounded-[1.5rem] border border-white/10 bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.15),_transparent_35%),linear-gradient(135deg,_#020617_0%,_#0f172a_45%,_#111827_100%)] p-4">
        {board.objects?.map((object) => (
          <div key={object.id} className="absolute rounded-xl border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 shadow-lg" style={{ left: object.x, top: object.y, width: object.width, height: object.height }}>
            {object.label || object.type}
          </div>
        ))}
      </div>
    </div>
  );
}
