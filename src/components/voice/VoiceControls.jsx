import { BookOpen, BrainCircuit, Briefcase, Code2, GraduationCap, Languages, Sparkles, NotebookPen } from 'lucide-react';

const modes = [
  { id: 'beginner', label: 'Beginner Teacher', icon: BookOpen },
  { id: 'school', label: 'School Teacher', icon: GraduationCap },
  { id: 'college', label: 'College Professor', icon: BrainCircuit },
  { id: 'coding', label: 'Coding Mentor', icon: Code2 },
  { id: 'interview', label: 'Interview Coach', icon: Briefcase },
  { id: 'exam', label: 'Exam Coach', icon: NotebookPen },
  { id: 'friendly', label: 'Friendly Tutor', icon: Sparkles },
];

export default function VoiceControls({ teacherMode, setTeacherMode, language, setLanguage, languageOptions = [], detectedLanguage }) {
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
        <div className="flex items-center gap-2 text-sm uppercase tracking-[0.35em] text-emerald-300">
          <Languages className="h-4 w-4" />
          <span>Language</span>
        </div>
        <select value={language} onChange={(event) => setLanguage(event.target.value)} className="mt-3 w-full rounded-[1.25rem] border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none">
          {languageOptions.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
        <p className="mt-3 text-sm text-slate-400">Detected language: {detectedLanguage || language}</p>
        <p className="mt-2 text-sm text-slate-500">The tutor adapts to beginner, intermediate, or advanced questions and can blend a second language for clarity.</p>
      </div>
    </div>
  );
}
