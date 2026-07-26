import { useMemo, useState } from 'react';
import { buildIntegrationCatalog, createAutomationTemplate, validateOAuthConfig } from '../../utils/integrationHelpers';

export default function Integrations() {
  const [activeCategory, setActiveCategory] = useState('Productivity');
  const [workflowName, setWorkflowName] = useState('Lead sync');
  const [oauthProvider, setOauthProvider] = useState('google');

  const catalog = useMemo(() => buildIntegrationCatalog(), []);
  const template = useMemo(() => createAutomationTemplate(workflowName), [workflowName]);
  const oauthValid = validateOAuthConfig(oauthProvider);

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 lg:p-10">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="rounded-3xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl">
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">Expansion Pack 2</p>
          <h1 className="mt-3 text-4xl font-semibold">Universal Integrations & Automation Platform</h1>
          <p className="mt-3 max-w-3xl text-slate-400">
            Connect productivity apps, cloud storage, AI providers, and business services through a unified control center.
          </p>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6">
            <div className="flex flex-wrap gap-2">
              {catalog.map((section) => (
                <button
                  key={section.category}
                  onClick={() => setActiveCategory(section.category)}
                  className={`rounded-full px-3 py-2 text-sm ${activeCategory === section.category ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-300'}`}
                >
                  {section.category}
                </button>
              ))}
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {catalog.find((section) => section.category === activeCategory)?.integrations.map((integration) => (
                <div key={integration.slug} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-white">{integration.name}</h3>
                    <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-xs text-emerald-300">{integration.status}</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-400">Connect this service and route data into Daksha AI workflows.</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6">
              <h2 className="text-xl font-semibold">Automation Builder</h2>
              <input
                value={workflowName}
                onChange={(event) => setWorkflowName(event.target.value)}
                className="mt-4 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
                placeholder="Workflow name"
              />
              <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                <p className="text-sm font-semibold text-cyan-300">{template.name}</p>
                <p className="mt-2 text-sm text-slate-400">Trigger: {template.trigger.type}</p>
                <p className="mt-1 text-sm text-slate-400">Actions: {template.actions.length}</p>
                <p className="mt-1 text-sm text-slate-400">Condition: {template.conditions[0].type}</p>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6">
              <h2 className="text-xl font-semibold">OAuth Center</h2>
              <select
                value={oauthProvider}
                onChange={(event) => setOauthProvider(event.target.value)}
                className="mt-4 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white"
              >
                <option value="google">Google</option>
                <option value="microsoft">Microsoft</option>
                <option value="github">GitHub</option>
                <option value="notion">Notion</option>
                <option value="slack">Slack</option>
              </select>
              <div className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${oauthValid ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-amber-500/30 bg-amber-500/10 text-amber-300'}`}>
                {oauthValid ? 'OAuth configuration is supported and ready for sign-in.' : 'This provider is not in the supported OAuth allow-list.'}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
