import { MessageCircleQuestion } from 'lucide-react';
import { useState } from 'react';

const quickQuestions = [
  'What is this?',
  "I didn't understand.",
  'Explain again.',
  'Give another example.',
  'Translate this.',
  'Why?',
  'How?',
  'Show me.'
];

export default function QuestionPanel({ onAsk }) {
  const [question, setQuestion] = useState('');

  const submit = () => {
    const text = String(question || '').trim();
    if (!text) return;
    onAsk(text);
    setQuestion('');
  };

  return (
    <section className="rounded-[1.75rem] border border-white/10 bg-slate-900/80 p-5 shadow-xl shadow-slate-950/30" aria-label="Interactive questions">
      <div className="flex items-center gap-2 text-cyan-300">
        <MessageCircleQuestion className="h-4 w-4" />
        <p className="text-xs uppercase tracking-[0.3em]">Interrupt & Ask</p>
      </div>

      <div className="mt-3 flex gap-2">
        <input
          id="lesson-question-input"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              submit();
            }
          }}
          placeholder="Ask anything while learning..."
          className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-white"
          aria-label="Ask question"
        />
        <button type="button" onClick={submit} className="rounded-xl bg-cyan-500 px-3 py-2 text-sm font-semibold text-slate-950">Ask</button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {quickQuestions.map((item) => (
          <button key={item} type="button" onClick={() => onAsk(item)} className="rounded-full border border-slate-700 bg-slate-950/70 px-3 py-1 text-xs text-slate-200">
            {item}
          </button>
        ))}
      </div>
    </section>
  );
}
