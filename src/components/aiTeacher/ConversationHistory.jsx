import { History } from 'lucide-react';

export default function ConversationHistory({ messages = [] }) {
  return (
    <section className="rounded-[1.75rem] border border-white/10 bg-slate-900/80 p-5 shadow-xl shadow-slate-950/30" aria-label="Conversation history">
      <div className="flex items-center gap-2 text-cyan-300">
        <History className="h-4 w-4" />
        <p className="text-xs uppercase tracking-[0.3em]">Conversation History</p>
      </div>

      <div className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
        {messages.length === 0 ? (
          <p className="rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-sm text-slate-400">No conversation yet.</p>
        ) : messages.map((message, index) => (
          <div key={`${message.role}-${index}`} className={`rounded-xl border p-3 text-sm ${message.role === 'learner' ? 'border-indigo-400/20 bg-indigo-500/10 text-indigo-100' : 'border-slate-800 bg-slate-950/70 text-slate-200'}`}>
            <p className="mb-1 text-[10px] uppercase tracking-[0.2em] text-slate-400">{message.role}</p>
            <p className="whitespace-pre-wrap">{message.content}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
