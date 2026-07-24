import { HelpCircle } from 'lucide-react';
export default function QuizCard({ quiz }) {
  if (!quiz || quiz.length === 0) return null;
  return (
    <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
      <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><HelpCircle className="w-5 h-5 text-indigo-500" /> Quiz</h3>
      <div className="space-y-4">
        {quiz.map((q, i) => (
          <div key={i}>
            <p className="font-medium mb-2">{i + 1}. {q.question}</p>
            <ul className="space-y-1 text-sm text-slate-400">
              {q.options?.map((opt, j) => (
                <li key={j} className={`p-2 rounded ${opt === q.answer ? 'bg-green-500/20 text-green-400' : 'bg-slate-800'}`}>
                  {opt}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
