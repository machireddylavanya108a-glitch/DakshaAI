export default function IntegrationCard({ integration }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-white">{integration.name}</h3>
        <span className="rounded-full bg-cyan-500/10 px-2 py-1 text-xs text-cyan-300">{integration.status}</span>
      </div>
      <p className="mt-2 text-sm text-slate-400">Ready for OAuth, webhooks, and automation orchestration.</p>
    </div>
  );
}
