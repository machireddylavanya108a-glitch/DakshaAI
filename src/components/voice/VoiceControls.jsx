import { BookOpen, BrainCircuit, Briefcase, Code2, GraduationCap, MessageCircle, Sparkles, NotebookPen } from 'lucide-react';

const modes = [
  { id: 'beginner', label: 'Beginner Teacher', icon: BookOpen },
  { id: 'school', label: 'School Teacher', icon: GraduationCap },
  { id: 'college', label: 'College Professor', icon: BrainCircuit },
  { id: 'coding', label: 'Coding Mentor', icon: Code2 },
  { id: 'interview', label: 'Interview Coach', icon: Briefcase },
  { id: 'exam', label: 'Exam Coach', icon: NotebookPen },
  { id: 'friendly', label: 'Friendly Tutor', icon: Sparkles },
];

const languages = ['English', 'Telugu', 'Hindi', 'Tamil', 'Kannada', 'Malayalam', 'Marathi', 'Bengali'];

export default function VoiceControls({ teacherMode, setTeacherMode, language, setLanguage }) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/40">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-[0.35em] text-emerald-300">Teaching Modes</p>
          <h3 className="mt-2 text-xl font-semibold text-white">Choose your tutor personality</h3>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {modes.map((mode) => {
          const Icon = mode.icon;
          const active = teacherMode === mode.id;
          return (
            <button key={mode.id} onClick={() => setTeacherMode(mode.id)} className={`flex items-center gap-3 rounded-[1.25rem] border px-4 py-3 text-left text-sm ${active ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200' : 'border-slate-800 bg-slate-950/70 text-slate-300'}`}>
              <Icon className="h-4 w-4" />
              <span>{mode.label}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-6">
        <p className="text-sm uppercase tracking-[0.35em] text-emerald-300">Language</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {languages.map((item) => (
            <button key={item} onClick={() => setLanguage(item)} className={`rounded-full px-3 py-2 text-sm ${language === item ? 'bg-sky-500/20 text-sky-300' : 'bg-slate-950/70 text-slate-300'}`}>
              {item}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
