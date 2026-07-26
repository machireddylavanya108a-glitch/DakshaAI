export default function QuestionCard({ question }) {
  return (
    <div className="rounded-[1rem] border border-white/10 bg-slate-900/80 p-3 text-sm text-slate-300">
      <p className="text-white">{question.prompt}</p>
    </div>
  );
}
