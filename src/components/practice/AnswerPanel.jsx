export default function AnswerPanel({ explanation, answer }) {
  return (
    <div className="rounded-[1rem] border border-white/10 bg-slate-950/70 p-3 text-sm text-slate-400">
      <p><strong className="text-white">Correct Answer:</strong> {answer}</p>
      <p className="mt-2"><strong className="text-white">Explanation:</strong> {explanation}</p>
    </div>
  );
}
