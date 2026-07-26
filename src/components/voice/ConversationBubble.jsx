export default function ConversationBubble({ role, text, timestamp }) {
  const isAssistant = role === 'assistant';

  return (
    <div className={`flex ${isAssistant ? 'justify-start' : 'justify-end'}`}>
      <div className={`max-w-[85%] rounded-[1.5rem] border px-4 py-3 text-sm shadow-lg ${isAssistant ? 'border-slate-700 bg-slate-950/70 text-slate-200' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100'}`}>
        <p className="font-semibold uppercase tracking-[0.24em] text-xs opacity-70">{isAssistant ? 'Teacher' : 'You'}</p>
        <p className="mt-2 whitespace-pre-wrap leading-7">{text}</p>
        <p className="mt-2 text-[11px] opacity-70">{timestamp}</p>
      </div>
    </div>
  );
}
