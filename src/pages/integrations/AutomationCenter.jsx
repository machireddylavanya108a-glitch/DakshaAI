import { useMemo } from 'react';
import { createAutomationTemplate } from '../../utils/integrationHelpers';

export default function AutomationCenter() {
  const template = useMemo(() => createAutomationTemplate('Sync to CRM'), []);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
      <h3 className="text-lg font-semibold text-white">Automation Center</h3>
      <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
        <p className="text-sm font-semibold text-cyan-300">{template.name}</p>
        <p className="mt-2 text-sm text-slate-400">Visual workflow builder, webhook triggers, conditions, loops, and AI decision nodes are supported by this platform shell.</p>
      </div>
    </div>
  );
}
