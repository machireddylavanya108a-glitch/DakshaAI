import { ShieldAlert, MessagesSquare } from 'lucide-react';

export default function ModerationPanel() {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-6">
      <div className="flex items-center gap-2 text-amber-200"><ShieldAlert className="h-5 w-5" /> Moderation queue</div>
      <p className="mt-3 text-sm text-slate-400">Review reported content, users, comments, and content approval requests.</p>
    </div>
  );
}
