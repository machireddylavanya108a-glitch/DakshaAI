import { CheckCircle2, XCircle, Clock3, Target, Sparkles } from 'lucide-react';

export default function QuizResult({ result, quiz, timeTaken, onRestart }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-slate-900/90 p-8 shadow-2xl shadow-slate-950/40">
      <div className="flex items-center gap-3 text-emerald-300">
        <Sparkles className="h-6 w-6" />
        <h3 className="text-2xl font-semibold text-white">Quiz Complete</h3>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-700 bg-slate-800/80 p-4">
          <p className="text-sm text-slate-400">Score</p>
          <p className="mt-2 text-3xl font-semibold text-white">{result.score}/{result.total}</p>
        </div>
        <div className="rounded-2xl border border-slate-700 bg-slate-800/80 p-4">
          <p className="text-sm text-slate-400">Correct</p>
          <p className="mt-2 text-3xl font-semibold text-emerald-300">{result.correctAnswers}</p>
        </div>
        <div className="rounded-2xl border border-slate-700 bg-slate-800/80 p-4">
          <p className="text-sm text-slate-400">Wrong</p>
          <p className="mt-2 text-3xl font-semibold text-rose-300">{result.wrongAnswers}</p>
        </div>
        <div className="rounded-2xl border border-slate-700 bg-slate-800/80 p-4">
          <p className="text-sm text-slate-400">Percentage</p>
          <p className="mt-2 text-3xl font-semibold text-cyan-300">{result.percentage}%</p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-700 bg-slate-800/70 p-4">
          <p className="text-sm text-slate-400">Grade</p>
          <p className="mt-2 text-xl font-semibold text-white">{result.grade}</p>
        </div>
        <div className="rounded-2xl border border-slate-700 bg-slate-800/70 p-4">
          <p className="text-sm text-slate-400">Time Taken</p>
          <p className="mt-2 flex items-center gap-2 text-xl font-semibold text-white"><Clock3 className="h-5 w-5" /> {timeTaken}</p>
        </div>
        <div className="rounded-2xl border border-slate-700 bg-slate-800/70 p-4">
          <p className="text-sm text-slate-400">Accuracy</p>
          <p className="mt-2 flex items-center gap-2 text-xl font-semibold text-white"><Target className="h-5 w-5" /> {result.percentage}%</p>
        </div>
      </div>

      <div className="mt-8 space-y-3">
        {quiz?.questions?.map((question, index) => (
          <div key={`${question.question}-${index}`} className="rounded-2xl border border-slate-700 bg-slate-800/70 p-4">
            <div className="flex items-start gap-2">
              {question.answer ? <CheckCircle2 className="mt-1 h-5 w-5 text-emerald-300" /> : <XCircle className="mt-1 h-5 w-5 text-rose-300" />}
              <div>
                <p className="font-medium text-white">{question.question}</p>
                <p className="mt-1 text-sm text-slate-400">Correct Answer: {question.answer}</p>
                <p className="mt-1 text-sm text-slate-400">Explanation: {question.explanation}</p>
                <p className="mt-1 text-sm text-slate-400">Reference Notes: {question.explanation}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button onClick={onRestart} className="mt-8 rounded-2xl bg-gradient-to-r from-indigo-500 to-cyan-500 px-5 py-3 font-semibold text-white transition hover:opacity-90">Restart Quiz</button>
    </div>
  );
}
