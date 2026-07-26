export default function PageSkeleton() {
  return (
    <div className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-4">
        <div className="h-24 animate-pulse rounded-[2rem] border border-white/10 bg-slate-900/80" />
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="h-64 animate-pulse rounded-[2rem] border border-white/10 bg-slate-900/80" />
          <div className="h-64 animate-pulse rounded-[2rem] border border-white/10 bg-slate-900/80" />
        </div>
      </div>
    </div>
  );
}
