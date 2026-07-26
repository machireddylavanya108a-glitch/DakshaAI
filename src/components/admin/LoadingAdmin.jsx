export default function LoadingAdmin() {
  return (
    <div className="min-h-[70vh] rounded-[2rem] border border-white/10 bg-slate-900/70 p-8 text-center text-slate-300">
      <div className="mx-auto h-3 w-40 animate-pulse rounded-full bg-cyan-400/20" />
      <div className="mx-auto mt-4 h-3 w-56 animate-pulse rounded-full bg-slate-800" />
      <div className="mx-auto mt-4 h-3 w-48 animate-pulse rounded-full bg-slate-800" />
    </div>
  );
}
