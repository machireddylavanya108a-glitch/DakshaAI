import { useState } from 'react';
import { MessageCircle, Send } from 'lucide-react';

export default function TutorChat({ messages, onSend }) {
  const [draft, setDraft] = useState('');

  return (
    <div className="rounded-[2rem] border border-white/10 bg-slate-900/75 p-5 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
      <div className="flex items-center gap-2 text-indigo-300"><MessageCircle className="h-4 w-4" /> Tutor Chat</div>
      <div className="mt-4 space-y-2 rounded-[1.2rem] border border-white/10 bg-slate-950/70 p-3">
        {messages.map((message, index) => (
          <div key={`${message.role}-${index}`} className={`rounded-[1rem] px-3 py-2 text-sm ${message.role === 'assistant' ? 'bg-indigo-500/10 text-indigo-100' : 'bg-slate-800 text-slate-200'}`}>
            {message.content}
          </div>
        ))}
      </div>
      <div className="mt-4 flex gap-2">
        <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Ask anything..." className="flex-1 rounded-full border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-slate-200 outline-none" />
        <button onClick={() => { if (!draft.trim()) return; onSend(draft); setDraft(''); }} className="rounded-full bg-indigo-500 p-2 text-slate-950">
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
