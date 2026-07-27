const ENVIRONMENT_PRESETS = {
  medicine: 'hospital',
  science: 'laboratory',
  chemistry: 'chemical-lab',
  engineering: 'mechanical-workshop',
  business: 'office',
  architecture: 'construction-site',
  cooking: 'kitchen',
  space: 'solar-system',
  geography: 'forest',
  ocean: 'ocean',
  general: 'classroom'
};

export function getEnvironmentOptions() {
  return [
    'hospital',
    'laboratory',
    'kitchen',
    'factory',
    'office',
    'construction-site',
    'classroom',
    'solar-system',
    'ocean',
    'forest',
    'mechanical-workshop',
    'chemical-lab'
  ];
}

export function detectEnvironmentPreset(subject = 'general', content = '') {
  const normalized = String(content || '').toLowerCase();
  if (/ocean|marine|water/.test(normalized)) return 'ocean';
  if (/forest|tree|jungle|ecology/.test(normalized)) return 'forest';
  if (/solar|planet|space|orbit/.test(normalized)) return 'solar-system';
  return ENVIRONMENT_PRESETS[subject] || ENVIRONMENT_PRESETS.general;
}

export default function EnvironmentController({ environment = 'classroom', onEnvironmentChange }) {
  const options = getEnvironmentOptions();

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-4">
      <p className="text-xs uppercase tracking-[0.28em] text-cyan-300">Environment Engine</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {options.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onEnvironmentChange?.(item)}
            className={`rounded-lg border px-2 py-1 text-xs ${environment === item ? 'border-cyan-400/40 bg-cyan-500/10 text-cyan-100' : 'border-slate-700 bg-slate-950/70 text-slate-200'}`}
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}
