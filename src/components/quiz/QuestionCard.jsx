import { CheckCircle2 } from 'lucide-react';

export default function QuestionCard({ question, currentAnswer, onSelect, index, total, answered }) {
  const options = Array.isArray(question?.options) ? question.options : [];
  const questionType = (question?.type || 'multiple-choice').toLowerCase();

  return (
    <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/40">
      <div className="mb-4 flex items-center justify-between text-sm text-slate-400">
        <span>Question {index + 1} / {total}</span>
        <span className="rounded-full border border-indigo-400/30 bg-indigo-500/10 px-3 py-1 text-indigo-200">{questionType.replace('-', ' ')}</span>
      </div>
      <h3 className="text-xl font-semibold text-white">{question?.question || 'Question'}</h3>

      {questionType === 'true/false' || questionType === 'true-false' ? (
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {['True', 'False'].map((option) => (
            <button
              key={option}
              onClick={() => onSelect(option)}
              className={`rounded-2xl border px-4 py-3 text-left transition ${currentAnswer === option ? 'border-emerald-400 bg-emerald-500/10 text-emerald-200' : 'border-slate-700 bg-slate-800/80 text-slate-200 hover:border-indigo-400'}`}
            >
              {option}
            </button>
          ))}
        </div>
      ) : questionType === 'fill-blanks' || questionType === 'fill-in-the-blank' ? (
        <div className="mt-6">
          <input
            value={currentAnswer || ''}
            onChange={(event) => onSelect(event.target.value)}
            placeholder="Type your answer"
            className="w-full rounded-2xl border border-slate-700 bg-slate-800/80 px-4 py-3 text-white outline-none ring-0"
          />
        </div>
      ) : questionType === 'drag drop' || questionType === 'arrange steps' || questionType === 'identify objects' ? (
        <div className="mt-6 rounded-2xl border border-slate-700 bg-slate-800/70 p-4 text-sm text-slate-300">
          <p className="mb-3">Select or arrange the best answer from the available options.</p>
          <textarea
            value={currentAnswer || ''}
            onChange={(event) => onSelect(event.target.value)}
            placeholder="Describe your selection or ordering"
            className="min-h-24 w-full rounded-2xl border border-slate-700 bg-slate-900/70 px-4 py-3 text-white outline-none"
          />
        </div>
      ) : questionType === 'match-the-following' ? (
        <div className="mt-6 rounded-2xl border border-slate-700 bg-slate-800/70 p-4 text-sm text-slate-300">
          <p className="mb-3">Match the terms to their correct description. This format is prepared for the generated quiz.</p>
          <textarea
            value={currentAnswer || ''}
            onChange={(event) => onSelect(event.target.value)}
            placeholder="Example: A -> 1, B -> 2"
            className="min-h-24 w-full rounded-2xl border border-slate-700 bg-slate-900/70 px-4 py-3 text-white outline-none"
          />
        </div>
      ) : questionType === 'voice' ? (
        <div className="mt-6 rounded-2xl border border-slate-700 bg-slate-800/70 p-4 text-sm text-slate-300">
          <p className="mb-3">Record a short spoken explanation for the prompt.</p>
          <textarea
            value={currentAnswer || ''}
            onChange={(event) => onSelect(event.target.value)}
            placeholder="Type your spoken explanation here"
            className="min-h-24 w-full rounded-2xl border border-slate-700 bg-slate-900/70 px-4 py-3 text-white outline-none"
          />
        </div>
      ) : questionType === 'coding' || questionType === 'math' ? (
        <div className="mt-6 rounded-2xl border border-slate-700 bg-slate-800/70 p-4 text-sm text-slate-300">
          <p className="mb-3">Write the solution or calculation steps.</p>
          <textarea
            value={currentAnswer || ''}
            onChange={(event) => onSelect(event.target.value)}
            placeholder="Enter your solution"
            className="min-h-24 w-full rounded-2xl border border-slate-700 bg-slate-900/70 px-4 py-3 text-white outline-none"
          />
        </div>
      ) : questionType === 'short-answer' ? (
        <div className="mt-6">
          <textarea
            value={currentAnswer || ''}
            onChange={(event) => onSelect(event.target.value)}
            placeholder="Write a short response"
            className="min-h-24 w-full rounded-2xl border border-slate-700 bg-slate-800/80 px-4 py-3 text-white outline-none"
          />
        </div>
      ) : (
        <div className="mt-6 grid gap-3">
          {options.map((option, optionIndex) => (
            <button
              key={`${option}-${optionIndex}`}
              onClick={() => onSelect(option)}
              className={`rounded-2xl border px-4 py-3 text-left transition ${currentAnswer === option ? 'border-emerald-400 bg-emerald-500/10 text-emerald-200' : 'border-slate-700 bg-slate-800/80 text-slate-200 hover:border-indigo-400'}`}
            >
              {option}
            </button>
          ))}
        </div>
      )}

      {answered && (
        <div className="mt-4 flex items-center gap-2 text-sm text-emerald-300">
          <CheckCircle2 className="h-4 w-4" />
          Answer saved.
        </div>
      )}
    </div>
  );
}
