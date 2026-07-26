export default function ActivityCard({ title, value, detail }) {
  return (
    <div className="rounded-[1.25rem] border border-white/10 bg-slate-950/70 p-4">
      <p className="text-sm text-slate-400">{title}</p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
      {detail ? <p className="mt-2 text-sm text-slate-500">{detail}</p> : null}
    </div>
  );
}
