import { Share2 } from 'lucide-react';

export default function NotesShare({ note }) {
  if (!note) return null;

  return (
    <div>
      <div className="flex items-center gap-2 text-cyan-300"><Share2 className="h-4 w-4" /> Share</div>
      <div className="mt-4 rounded-[1rem] border border-white/10 bg-slate-950/70 p-4 text-sm text-slate-400">
        <p className="text-white">Shareable note link</p>
        <p className="mt-2 break-all">https://daksha.ai/notes/{note.id}</p>
        <button className="mt-3 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-200">Share Note</button>
      </div>
    </div>
  );
}
