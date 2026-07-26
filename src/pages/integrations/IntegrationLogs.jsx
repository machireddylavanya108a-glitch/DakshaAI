export default function IntegrationLogs() {
  const logs = [
    { id: 1, event: 'Sync completed', status: 'success' },
    { id: 2, event: 'Webhook delivered', status: 'success' },
    { id: 3, event: 'OAuth refresh pending', status: 'warning' }
  ];

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
      <h3 className="text-lg font-semibold text-white">Integration Logs</h3>
      <div className="mt-4 space-y-3">
        {logs.map((log) => (
          <div key={log.id} className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-sm text-slate-400">
            {log.event} <span className="ml-2 text-cyan-300">{log.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
