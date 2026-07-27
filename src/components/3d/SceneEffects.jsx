const EFFECT_LIBRARY = [
  'smoke',
  'fire',
  'electricity',
  'bloodFlow',
  'waterFlow',
  'particles',
  'wind',
  'heat',
  'laser',
  'magneticField',
  'soundWaves',
  'chemicalReactions'
];

export function getSuggestedEffects(content = '', selectedPart = '') {
  const text = `${content || ''} ${selectedPart || ''}`.toLowerCase();
  const results = [];
  if (/heart|blood|artery|ventricle/.test(text)) results.push('bloodFlow');
  if (/chemistry|reaction|molecule|acid|base/.test(text)) results.push('chemicalReactions');
  if (/electric|circuit|cpu|voltage|electron/.test(text)) results.push('electricity', 'magneticField');
  if (/water|ocean|fluid/.test(text)) results.push('waterFlow');
  if (/heat|engine|temperature|combustion/.test(text)) results.push('heat', 'smoke');
  if (/laser|beam/.test(text)) results.push('laser');
  if (/wind|air/.test(text)) results.push('wind');
  if (/sound|wave/.test(text)) results.push('soundWaves');
  if (!results.length) results.push('particles');
  return Array.from(new Set(results));
}

export default function SceneEffects({ activeEffects = [], onToggleEffect }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-4">
      <p className="text-xs uppercase tracking-[0.28em] text-cyan-300">Scene Effects</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {EFFECT_LIBRARY.map((effect) => {
          const enabled = activeEffects.includes(effect);
          return (
            <button
              key={effect}
              type="button"
              onClick={() => onToggleEffect?.(effect)}
              className={`rounded-lg border px-2 py-1 text-xs ${enabled ? 'border-amber-400/40 bg-amber-500/10 text-amber-100' : 'border-slate-700 bg-slate-950/70 text-slate-200'}`}
            >
              {effect}
            </button>
          );
        })}
      </div>
    </div>
  );
}
