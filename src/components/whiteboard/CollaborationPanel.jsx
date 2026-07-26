import { Users } from 'lucide-react';

export default function CollaborationPanel() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-emerald-300">
        <Users className="h-4 w-4" /> Collaboration
      </div>
      <div className="rounded-2xl border border-white/10 bg-slate-800/60 p-3 text-sm text-slate-300">
        Live cursors • comments • mentions • chat • real-time sync • permissions
      </div>
    </div>
  );
}
