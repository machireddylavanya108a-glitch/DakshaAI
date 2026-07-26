export default function MCQQuestion({ question, value, onChange }) {
  return (
    <div className="space-y-2">
      {question.options?.map((option) => (
        <label key={option} className="flex items-center gap-2 rounded-[0.9rem] border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-slate-300">
          <input type="radio" name={question.id} value={option} checked={value === option} onChange={() => onChange(option)} />
          <span>{option}</span>
        </label>
      ))}
    </div>
  );
}
