import { useState } from 'react';
import { Mic, Volume2 } from 'lucide-react';

export default function TutorVoice({ topic, mode }) {
  const [listening, setListening] = useState(false);
  return (
    <div className="rounded-[2rem] border border-white/10 bg-slate-900/75 p-5 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
      <div className="flex items-center gap-2 text-indigo-300"><Mic className="h-4 w-4" /> Voice Tutor</div>
      <div className="mt-4 rounded-[1.2rem] border border-white/10 bg-slate-950/70 p-4 text-sm text-slate-400">
        <p className="text-white">Your voice teacher is ready for {topic || 'any topic'}.</p>
        <p className="mt-2">Mode: {mode}</p>
        <p className="mt-2">Natural spoken replies and multilingual support are prepared for the learner experience.</p>
      </div>
      <button onClick={() => setListening((value) => !value)} className={`mt-4 flex items-center gap-2 rounded-full px-4 py-3 text-sm font-semibold ${listening ? 'bg-emerald-500 text-slate-950' : 'bg-indigo-500 text-slate-950'}`}>
        {listening ? <Volume2 className="h-4 w-4" /> : <Mic className="h-4 w-4" />} {listening ? 'Listening...' : 'Start Voice Session'}
      </button>
    </div>
  );
}
