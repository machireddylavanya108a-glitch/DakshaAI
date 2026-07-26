import { Mic, Square, PauseCircle, PlayCircle, AudioLines } from 'lucide-react';

export default function VoiceRecorder({
  topic,
  setTopic,
  isListening,
  isSpeaking,
  pushToTalk,
  handsFree,
  onStart,
  onStop,
  onTogglePushToTalk,
  onToggleHandsFree,
  onInterrupt,
  recognitionSupported,
}) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/40">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-[0.35em] text-emerald-300">Voice Interaction</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Start a real conversation</h2>
        </div>
        <div className={`rounded-full px-3 py-1 text-sm ${recognitionSupported ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-300'}`}>
          {recognitionSupported ? 'Mic ready' : 'Browser unsupported'}
        </div>
      </div>

      <input
        value={topic}
        onChange={(event) => setTopic(event.target.value)}
        placeholder="What would you like to learn today?"
        className="mt-5 w-full rounded-[1.25rem] border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none"
      />

      <div className="mt-5 flex flex-wrap gap-3">
        <button onClick={onStart} className="rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400">
          <span className="flex items-center gap-2"><Mic className="h-4 w-4" /> Start Conversation</span>
        </button>
        <button onClick={onStop} className="rounded-2xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-200">
          <span className="flex items-center gap-2"><Square className="h-4 w-4" /> Stop Conversation</span>
        </button>
        <button onClick={onInterrupt} className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
          <span className="flex items-center gap-2"><PauseCircle className="h-4 w-4" /> Interrupt AI</span>
        </button>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <button onClick={onTogglePushToTalk} className={`rounded-2xl px-4 py-2 text-sm ${pushToTalk ? 'bg-sky-500/20 text-sky-300' : 'bg-slate-800 text-slate-300'}`}>
          <span className="flex items-center gap-2"><PlayCircle className="h-4 w-4" /> Push to Talk</span>
        </button>
        <button onClick={onToggleHandsFree} className={`rounded-2xl px-4 py-2 text-sm ${handsFree ? 'bg-fuchsia-500/20 text-fuchsia-300' : 'bg-slate-800 text-slate-300'}`}>
          <span className="flex items-center gap-2"><AudioLines className="h-4 w-4" /> Hands-Free</span>
        </button>
      </div>

      <div className="mt-5 rounded-[1.25rem] border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-300">
        <p className="font-medium text-white">Current status</p>
        <p className="mt-2">Listening: {isListening ? 'Active' : 'Idle'}</p>
        <p className="mt-1">Speaking: {isSpeaking ? 'Streaming response' : 'Ready'}</p>
      </div>
    </div>
  );
}
