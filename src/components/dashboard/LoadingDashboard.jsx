export default function LoadingDashboard() {
  return (
    <div className="space-y-4">
      <div className="h-24 animate-pulse rounded-[2rem] bg-slate-800/80" />
      <div className="grid gap-4 md:grid-cols-3">
        <div className="h-24 animate-pulse rounded-[1.5rem] bg-slate-800/80" />
        <div className="h-24 animate-pulse rounded-[1.5rem] bg-slate-800/80" />
        <div className="h-24 animate-pulse rounded-[1.5rem] bg-slate-800/80" />
      </div>
      <div className="h-48 animate-pulse rounded-[2rem] bg-slate-800/80" />
    </div>
  );
}
