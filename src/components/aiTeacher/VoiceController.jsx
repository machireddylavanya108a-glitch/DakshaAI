import { Captions, Languages, Mic, Volume2 } from 'lucide-react';

export default function VoiceController({ value, onChange, onVoiceCommand }) {
  const setField = (field, fieldValue) => {
    onChange({
      ...value,
      [field]: fieldValue
    });
  };

  return (
    <section className="rounded-[1.75rem] border border-white/10 bg-slate-900/80 p-5 shadow-xl shadow-slate-950/30" aria-label="Voice controls">
      <div className="flex items-center gap-2 text-cyan-300">
        <Volume2 className="h-4 w-4" />
        <p className="text-xs uppercase tracking-[0.3em]">Voice Teacher</p>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="text-sm text-slate-300">
          Voice Style
          <select value={value.voiceType} onChange={(event) => setField('voiceType', event.target.value)} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-white">
            <option value="natural">Natural AI Voice</option>
            <option value="male">Male Voice</option>
            <option value="female">Female Voice</option>
          </select>
        </label>

        <label className="text-sm text-slate-300">
          Speech Speed
          <select value={value.speed} onChange={(event) => setField('speed', event.target.value)} className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-white">
            <option value="slow">Slow</option>
            <option value="normal">Normal</option>
            <option value="fast">Fast</option>
          </select>
        </label>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-300">
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" checked={Boolean(value.captions)} onChange={(event) => setField('captions', event.target.checked)} />
          <Captions className="h-4 w-4" /> Captions
        </label>
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" checked={Boolean(value.subtitles)} onChange={(event) => setField('subtitles', event.target.checked)} />
          <Languages className="h-4 w-4" /> Subtitles
        </label>
        <button type="button" onClick={onVoiceCommand} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950/70 px-3 py-2 text-xs text-white">
          <Mic className="h-3.5 w-3.5" /> Voice Command
        </button>
      </div>
    </section>
  );
}
