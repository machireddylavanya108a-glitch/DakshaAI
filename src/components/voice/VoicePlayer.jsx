import { Volume2, VolumeX, SkipForward } from 'lucide-react';

export default function VoicePlayer({ isSpeaking, voiceSpeed, voicePitch, onSpeedChange, onPitchChange, onStop, onPauseResume, paused }) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/40">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-[0.35em] text-emerald-300">Voice Settings</p>
          <h3 className="mt-2 text-xl font-semibold text-white">Tune the teaching voice</h3>
        </div>
        <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 p-2 text-emerald-300">
          {isSpeaking ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
        </div>
      </div>

      <div className="mt-5 space-y-4">
        <label className="block text-sm text-slate-300">
          <span className="mb-2 block">Speed: {voiceSpeed.toFixed(1)}x</span>
          <input type="range" min="0.7" max="1.8" step="0.1" value={voiceSpeed} onChange={onSpeedChange} className="w-full accent-emerald-500" />
        </label>
        <label className="block text-sm text-slate-300">
          <span className="mb-2 block">Pitch: {voicePitch.toFixed(1)}</span>
          <input type="range" min="0.7" max="1.5" step="0.1" value={voicePitch} onChange={onPitchChange} className="w-full accent-sky-500" />
        </label>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <button onClick={onPauseResume} className="rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-2 text-sm text-slate-200">
          {paused ? 'Resume' : 'Pause'}
        </button>
        <button onClick={onStop} className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-sm text-rose-300">
          <span className="flex items-center gap-2"><SkipForward className="h-4 w-4" /> Stop</span>
        </button>
      </div>
    </div>
  );
}
