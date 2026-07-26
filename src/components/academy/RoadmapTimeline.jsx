export default function RoadmapTimeline({ items = [] }) {
  return (
    <div className="space-y-4">
      {items.map((item, index) => (
        <div key={`${item}-${index}`} className="flex gap-3 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
          <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-500/10 text-sm font-semibold text-indigo-400">
            {index + 1}
          </div>
          <div>
            <p className="text-sm leading-7 text-slate-300">{item}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
