import MCQQuestion from './MCQQuestion';
import CodingQuestion from './CodingQuestion';
import EssayQuestion from './EssayQuestion';
import DrawingQuestion from './DrawingQuestion';
import MathQuestion from './MathQuestion';
import CaseStudyQuestion from './CaseStudyQuestion';

export default function QuestionRenderer({ question, value, onChange }) {
  switch (question.type) {
    case 'MCQ':
      return <MCQQuestion question={question} value={value} onChange={onChange} />;
    case 'Coding Challenge':
      return <CodingQuestion question={question} value={value} onChange={onChange} />;
    case 'Essay':
    case 'Long Answer':
      return <EssayQuestion question={question} value={value} onChange={onChange} />;
    case 'Drawing':
      return <DrawingQuestion question={question} value={value} onChange={onChange} />;
    case 'Numerical Problems':
      return <MathQuestion question={question} value={value} onChange={onChange} />;
    case 'Case Study':
      return <CaseStudyQuestion question={question} value={value} onChange={onChange} />;
    default:
      return (
        <div className="space-y-3">
          <textarea value={value || ''} onChange={(event) => onChange(event.target.value)} className="min-h-28 w-full rounded-[1rem] border border-white/10 bg-slate-900/80 px-3 py-3 text-sm text-slate-200 outline-none" placeholder="Type your answer here..." />
        </div>
      );
  }
}
