export default function LoadingVoice() {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-8 shadow-2xl shadow-slate-950/40">
      <div className="animate-pulse space-y-4">
        <div className="h-4 w-40 rounded-full bg-slate-700" />
        <div className="h-6 w-60 rounded-full bg-slate-700" />
        <div className="h-24 rounded-[1.5rem] bg-slate-800" />
      </div>
    </div>
  );
}
