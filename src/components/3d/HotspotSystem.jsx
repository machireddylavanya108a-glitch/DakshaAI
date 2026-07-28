export default function HotspotSystem({ hotspots = [] }) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {hotspots.map((hotspot) => (
        <span key={hotspot.label} className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-200">
          {hotspot.label}
        </span>
      ))}
    </div>
  );
}
