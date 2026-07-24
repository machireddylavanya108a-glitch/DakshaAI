import { BookOpen } from 'lucide-react';
export default function LessonCard({ icon: Icon, title, content }) {
  if (!content) return null;
  return (
    <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800">
      <h3 className="text-xl font-bold mb-3 flex items-center gap-2"><Icon className="w-5 h-5 text-indigo-500" /> {title}</h3>
      <p className="text-slate-300 whitespace-pre-wrap leading-relaxed text-sm">{content}</p>
    </div>
  );
}
