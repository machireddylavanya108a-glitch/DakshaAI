import { Film, Image, AudioLines } from 'lucide-react';

export default function MediaManager() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {['Images', 'Video', 'Audio'].map((item) => (
        <div key={item} className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-4">
          <div className="flex items-center gap-2 text-pink-200"><Image className="h-4 w-4" /> {item}</div>
          <p className="mt-3 text-sm text-slate-400">Manage media libraries and ensure fast delivery.</p>
        </div>
      ))}
    </div>
  );
}
