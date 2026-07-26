export default function LoadingWebsite() {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-8 text-center shadow-2xl shadow-slate-950/40">
      <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-emerald-400/30 border-t-emerald-400" />
      <h3 className="text-xl font-semibold text-white">Analyzing the webpage</h3>
      <p className="mt-2 text-sm text-slate-400">Cleaning the content, extracting structure, and turning it into a complete learning experience.</p>
    </div>
  );
}
