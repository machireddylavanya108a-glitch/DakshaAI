import { useMemo } from 'react';
import { buildIntegrationCatalog } from '../../utils/integrationHelpers';

export default function IntegrationStore() {
  const catalog = useMemo(() => buildIntegrationCatalog(), []);

  return (
    <div className="space-y-6">
      {catalog.map((section) => (
        <div key={section.category} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
          <h3 className="text-lg font-semibold text-white">{section.category}</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {section.integrations.map((integration) => (
              <div key={integration.slug} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-white">{integration.name}</span>
                  <span className="text-xs uppercase tracking-[0.2em] text-cyan-300">{integration.type}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
