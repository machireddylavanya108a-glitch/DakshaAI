const HIGHLIGHT_PRESETS = {
  glow: { emissiveIntensity: 0.6, scale: 1.1, opacity: 1, hideOthers: false },
  outline: { emissiveIntensity: 0.35, scale: 1.06, opacity: 1, hideOthers: false },
  pulse: { emissiveIntensity: 0.75, scale: 1.12, opacity: 1, hideOthers: false },
  colorChange: { emissiveIntensity: 0.25, scale: 1.05, opacity: 1, hideOthers: false },
  transparent: { emissiveIntensity: 0.15, scale: 1.05, opacity: 0.45, hideOthers: false },
  isolate: { emissiveIntensity: 0.4, scale: 1.08, opacity: 1, hideOthers: true },
  hideOthers: { emissiveIntensity: 0.45, scale: 1.08, opacity: 1, hideOthers: true },
  none: { emissiveIntensity: 0, scale: 1, opacity: 1, hideOthers: false }
};

export function getHighlightPreset(mode = 'none') {
  return HIGHLIGHT_PRESETS[mode] || HIGHLIGHT_PRESETS.none;
}

export function mapHighlightByNarration(text = '') {
  const normalized = String(text || '').toLowerCase();
  if (!normalized) return 'none';
  if (normalized.includes('focus only') || normalized.includes('isolate')) return 'isolate';
  if (normalized.includes('transparent') || normalized.includes('x-ray')) return 'transparent';
  if (normalized.includes('pulse')) return 'pulse';
  if (normalized.includes('outline')) return 'outline';
  if (normalized.includes('glow')) return 'glow';
  return 'colorChange';
}

export default function ObjectHighlighter({ mode = 'none', selectedPart = '', onModeChange }) {
  const modes = ['glow', 'outline', 'pulse', 'colorChange', 'transparent', 'isolate', 'hideOthers', 'none'];

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-4">
      <p className="text-xs uppercase tracking-[0.28em] text-cyan-300">Object Highlighter</p>
      <p className="mt-2 text-xs text-slate-400">Active object: {selectedPart || 'auto'}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {modes.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onModeChange?.(item)}
            className={`rounded-lg border px-2 py-1 text-xs ${mode === item ? 'border-cyan-400/40 bg-cyan-500/10 text-cyan-100' : 'border-slate-700 bg-slate-950/70 text-slate-200'}`}
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}
