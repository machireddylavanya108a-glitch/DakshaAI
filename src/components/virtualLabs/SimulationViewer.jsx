import { Play, Pause, RotateCcw, Gauge, ZoomIn, RotateCw, Maximize2, StepForward, StepBack } from 'lucide-react';

export default function SimulationViewer({ lab, isPlaying, currentStep, speed, zoom, rotation, isFullscreen, onPlayPause, onReset, onStepBack, onStepForward, onSpeedChange, onZoomChange, onRotateChange, onFullscreen }) {
  return (
    <div className={`rounded-[2rem] border border-white/10 bg-slate-900/75 p-5 shadow-2xl shadow-slate-950/40 backdrop-blur-xl ${isFullscreen ? 'ring-2 ring-cyan-400/40' : ''}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-cyan-300">AI Simulation</p>
          <h2 className="text-xl font-semibold text-white">{lab.simulation.title}</h2>
        </div>
        <button onClick={onFullscreen} className="rounded-full border border-white/10 bg-slate-950/70 p-2 text-slate-200">
          <Maximize2 className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-4 rounded-[1.5rem] border border-white/10 bg-slate-950/70 p-4">
        <div className="flex items-center justify-between text-sm text-slate-400">
          <span>Step {currentStep + 1} / {lab.simulation.steps.length}</span>
          <span>Speed x{speed}</span>
        </div>
        <div className="mt-4 overflow-hidden rounded-[1.2rem] border border-white/10 bg-gradient-to-br from-cyan-500/20 to-slate-900 p-6">
          <div className="flex h-40 items-center justify-center rounded-[1rem] border border-dashed border-cyan-400/30 bg-slate-950/70 text-center text-sm text-slate-300" style={{ transform: `scale(${zoom}) rotate(${rotation}deg)` }}>
            <div>
              <p className="text-lg font-semibold text-white">{lab.simulation.steps[currentStep]?.title}</p>
              <p className="mt-2 max-w-xs text-slate-400">{lab.simulation.steps[currentStep]?.detail}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button onClick={onPlayPause} className="rounded-full bg-cyan-500 px-3 py-2 text-sm font-semibold text-slate-950">{isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}</button>
        <button onClick={onReset} className="rounded-full border border-white/10 bg-slate-950/70 p-2 text-slate-200"><RotateCcw className="h-4 w-4" /></button>
        <button onClick={onStepBack} className="rounded-full border border-white/10 bg-slate-950/70 p-2 text-slate-200"><StepBack className="h-4 w-4" /></button>
        <button onClick={onStepForward} className="rounded-full border border-white/10 bg-slate-950/70 p-2 text-slate-200"><StepForward className="h-4 w-4" /></button>
        <label className="flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-slate-300">
          <Gauge className="h-4 w-4" />
          <input type="range" min="1" max="4" value={speed} onChange={(event) => onSpeedChange(Number(event.target.value))} className="accent-cyan-400" />
        </label>
        <label className="flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-slate-300">
          <ZoomIn className="h-4 w-4" />
          <input type="range" min="0.8" max="1.8" step="0.1" value={zoom} onChange={(event) => onZoomChange(Number(event.target.value))} className="accent-cyan-400" />
        </label>
        <label className="flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-slate-300">
          <RotateCw className="h-4 w-4" />
          <input type="range" min="0" max="360" step="15" value={rotation} onChange={(event) => onRotateChange(Number(event.target.value))} className="accent-cyan-400" />
        </label>
      </div>

      <div className="mt-4 rounded-[1.2rem] border border-white/10 bg-slate-950/70 p-4 text-sm text-slate-400">
        {lab.simulation.notes.map((note) => <p key={note} className="mt-1">• {note}</p>)}
      </div>
    </div>
  );
}
