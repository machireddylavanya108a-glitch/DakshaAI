export default function ConnectedApps() {
  const apps = [
    { name: 'Google Workspace', state: 'Connected' },
    { name: 'Slack', state: 'Connected' },
    { name: 'GitHub', state: 'Pending review' }
  ];

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
      <h3 className="text-lg font-semibold text-white">Connected Apps</h3>
      <div className="mt-4 space-y-3">
        {apps.map((app) => (
          <div key={app.name} className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3">
            <span className="text-sm text-white">{app.name}</span>
            <span className="text-sm text-cyan-300">{app.state}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
