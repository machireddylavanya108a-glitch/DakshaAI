import { validateOAuthConfig } from '../../utils/integrationHelpers';

export default function OAuthManager() {
  const providers = ['google', 'microsoft', 'github', 'notion', 'slack'];

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
      <h3 className="text-lg font-semibold text-white">OAuth Manager</h3>
      <div className="mt-4 space-y-3">
        {providers.map((provider) => {
          const supported = validateOAuthConfig(provider);
          return (
            <div key={provider} className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3">
              <span className="text-sm text-white">{provider}</span>
              <span className={`text-sm ${supported ? 'text-emerald-300' : 'text-amber-300'}`}>{supported ? 'Supported' : 'Unsupported'}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
