import { Mic } from 'lucide-react';

export default function VoiceNotes() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-rose-300">
        <Mic className="h-4 w-4" /> Voice collaboration
      </div>
      <div className="rounded-2xl border border-white/10 bg-slate-800/60 p-3 text-sm text-slate-300">
        Voice commands, speech-to-text, text-to-speech, and collaborative audio notes are supported.
      </div>
    </div>
  );
}
