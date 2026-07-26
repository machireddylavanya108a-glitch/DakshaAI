import { BookOpen, GraduationCap } from 'lucide-react';

export default function CoursesManager() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {['AI Foundations', 'Advanced Prompt Engineering', 'Enterprise Strategy'].map((course) => (
        <div key={course} className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-4">
          <div className="flex items-center gap-2 text-cyan-200"><GraduationCap className="h-4 w-4" /> {course}</div>
          <p className="mt-3 text-sm text-slate-400">Manage lifecycle, enrollment, curriculum, and completion state.</p>
        </div>
      ))}
    </div>
  );
}
