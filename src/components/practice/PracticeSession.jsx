import { useEffect, useRef, useState } from 'react';
import { MessageSquare, Mic, MicOff, AlertCircle } from 'lucide-react';

export default function PracticeSession({ question, onSubmit }) {
  const [answer, setAnswer] = useState('');
  const [selectedOption, setSelectedOption] = useState('');
  const [confidence, setConfidence] = useState(70);
  const [voiceActive, setVoiceActive] = useState(false);
  const [inputError, setInputError] = useState('');
  const questionStartedAt = useRef(Date.now());

  useEffect(() => {
    setAnswer('');
    setSelectedOption('');
    setConfidence(70);
    setInputError('');
    questionStartedAt.current = Date.now();
  }, [question?.id]);

  const startVoiceCapture = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setInputError('Voice input is not supported in this browser.');
      return;
    }

    setInputError('');
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    setVoiceActive(true);
    recognition.onresult = (event) => {
      const transcript = event?.results?.[0]?.[0]?.transcript || '';
      setAnswer((prev) => `${prev}${prev ? ' ' : ''}${transcript}`.trim());
      setVoiceActive(false);
    };
    recognition.onerror = () => setVoiceActive(false);
    recognition.onend = () => setVoiceActive(false);
    recognition.start();
  };

  const resolveAnswer = () => {
    if (question?.options?.length) return selectedOption;
    return answer.trim();
  };

  const handleSubmit = () => {
    const learnerAnswer = resolveAnswer();
    if (!learnerAnswer) {
      setInputError('Please provide an answer before submitting.');
      return;
    }

    onSubmit(learnerAnswer, {
      confidence,
      responseTimeSec: Math.round((Date.now() - questionStartedAt.current) / 1000)
    });
  };

  if (!question) {
    return <div className="rounded-[1.2rem] border border-white/10 bg-slate-950/70 p-6 text-sm text-slate-400">No active question yet. Start a practice session to begin.</div>;
  }

  return (
    <div className="rounded-[1.2rem] border border-white/10 bg-slate-950/70 p-5">
      <div className="flex items-center gap-2 text-cyan-300"><MessageSquare className="h-4 w-4" /> Current Question</div>
      <div className="mt-4 rounded-[1rem] border border-white/10 bg-slate-900/80 p-4">
        <p className="text-sm uppercase tracking-[0.25em] text-cyan-400">{question.type}</p>
        <p className="mt-1 text-xs text-slate-400">Difficulty: {question.difficulty}</p>
        <p className="mt-2 text-lg font-semibold text-white">{question.prompt}</p>
        {question.options?.length ? (
          <div className="mt-4 grid gap-2">
            {question.options.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setSelectedOption(option)}
                className={`rounded-[0.9rem] border px-3 py-2 text-left text-sm ${selectedOption === option ? 'border-cyan-400 bg-cyan-500/20 text-cyan-100' : 'border-white/10 bg-slate-950/70 text-slate-300'}`}
              >
                {option}
              </button>
            ))}
          </div>
        ) : null}

        {question.type === 'Drag & Drop' ? <p className="mt-3 text-xs text-amber-200">Drag & Drop mode: enter the final order as a sequence (example: Understand &gt; Plan &gt; Execute &gt; Review).</p> : null}
        {question.type === 'Diagram labeling' ? <p className="mt-3 text-xs text-amber-200">Diagram mode: provide labels and order in a single line.</p> : null}
        {question.type === 'Interactive 3D Tasks' ? <p className="mt-3 text-xs text-amber-200">3D task mode: describe the selected model part and its function.</p> : null}
      </div>

      {!question.options?.length ? (
        <textarea value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder="Type your answer or reasoning here..." className="mt-4 min-h-28 w-full rounded-[1rem] border border-white/10 bg-slate-900/80 px-3 py-3 text-sm text-slate-200 outline-none" />
      ) : null}

      <div className="mt-3 rounded-[0.9rem] border border-white/10 bg-slate-900/80 p-3 text-sm text-slate-300">
        <label htmlFor="confidence" className="block text-xs uppercase tracking-[0.2em] text-cyan-300">Confidence</label>
        <input id="confidence" type="range" min="0" max="100" value={confidence} onChange={(event) => setConfidence(Number(event.target.value))} className="mt-2 w-full" />
        <p className="mt-1 text-xs text-slate-400">Confidence: {confidence}%</p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={handleSubmit} className="rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950">Submit Answer</button>
        <button type="button" onClick={startVoiceCapture} className="rounded-full border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-slate-300">
          {voiceActive ? <MicOff className="mr-2 inline h-4 w-4" /> : <Mic className="mr-2 inline h-4 w-4" />}
          {voiceActive ? 'Listening...' : 'Voice Answer'}
        </button>
      </div>

      {inputError ? (
        <p className="mt-3 rounded-[0.9rem] border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          <AlertCircle className="mr-1 inline h-4 w-4" />
          {inputError}
        </p>
      ) : null}

      <p className="mt-3 text-xs text-slate-500">Hint: {question.hint || 'Use concept + reasoning + example.'}</p>
      <p className="mt-1 text-xs text-slate-500">Concept focus: {question.concept || 'Core concept'}</p>
      <p className="mt-1 text-xs text-slate-500">For wrong answers, the engine will explain why, show the correct answer, suggest replay section, and recommend next practice.</p>
      <div className="mt-2 rounded-[0.9rem] border border-cyan-500/20 bg-cyan-500/10 p-2 text-[11px] text-cyan-100">
        Smart feedback includes: why answer is wrong, correct answer, replay section, concept highlights, and targeted next practice.
      </div>
    </div>
  );
}
