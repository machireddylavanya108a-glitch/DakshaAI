export default function IntegrationDetails({ integration }) {
  if (!integration) return null;

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
      <h3 className="text-xl font-semibold text-white">{integration.name}</h3>
      <p className="mt-2 text-sm text-slate-400">This connector supports token-based auth, event triggers, and action execution inside Daksha AI.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <span className="rounded-full bg-slate-800 px-3 py-1 text-sm text-slate-300">OAuth 2.0</span>
        <span className="rounded-full bg-slate-800 px-3 py-1 text-sm text-slate-300">Webhook</span>
        <span className="rounded-full bg-slate-800 px-3 py-1 text-sm text-slate-300">Automation</span>
      </div>
    </div>
  );
}
