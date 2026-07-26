export default function AchievementCard({ title, text, earned = true }) {
  return (
    <div className={`rounded-[1.25rem] border px-4 py-3 ${earned ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200' : 'border-slate-700 bg-slate-950/70 text-slate-400'}`}>
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-sm">{text}</p>
    </div>
  );
}
