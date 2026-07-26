import { BellRing, RadioTower } from 'lucide-react';

export default function NotificationsManager() {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-6">
      <div className="flex items-center gap-2 text-cyan-200"><BellRing className="h-5 w-5" /> Notification center</div>
      <p className="mt-3 text-sm text-slate-400">Manage announcements, system messages, push notifications, and maintenance alerts.</p>
    </div>
  );
}
