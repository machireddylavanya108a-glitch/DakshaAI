import { useState } from 'react';
import { BookOpenText, Sparkles, Lightbulb, AlertTriangle, RefreshCw, Copy, Download } from 'lucide-react';
import TopicInput from '../components/teacher/TopicInput';
import TeacherCard from '../components/teacher/TeacherCard';
import TeacherSection from '../components/teacher/TeacherSection';
import LoadingTeacher from '../components/teacher/LoadingTeacher';
import { generateTeacherLesson } from '../services/aiService';
import { normalizeTeacherLesson } from '../utils/teacherUtils';

export default function Teacher() {
  const [topic, setTopic] = useState('');
  const [lesson, setLesson] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    const value = topic.trim();
    if (!value) return;

    setLoading(true);
    setError('');
    setLesson(null);

    try {
      const payload = await generateTeacherLesson(value);
      const normalized = normalizeTeacherLesson(payload, value);
      setLesson(normalized);
    } catch (err) {
      console.error(err);
      setError('Daksha could not generate a lesson for that topic right now. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyText = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error(err);
    }
  };

  const downloadText = (title, content) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.replace(/\s+/g, '-').toLowerCase()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-[calc(100vh-10rem)] bg-slate-950 text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-2 py-4 sm:px-4 lg:px-0">
        <header className="overflow-hidden rounded-[2rem] border border-slate-800/70 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/80 p-8 shadow-2xl shadow-slate-950/40">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-sm text-indigo-300">
                <Sparkles className="h-4 w-4" />
                Professional AI teaching experience
              </div>
              <h1 className="text-3xl font-semibold sm:text-4xl">Learn any topic like a guided teacher</h1>
              <p className="mt-3 text-base leading-7 text-slate-400">
                Ask for a subject and Daksha will build a beginner-friendly explanation, a deeper walkthrough, and practical examples you can study immediately.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-sm text-slate-300">
              <p className="font-medium text-white">What you get</p>
              <ul className="mt-2 space-y-2 text-slate-400">
                <li>• Clear beginner, intermediate, and advanced explanations</li>
                <li>• Real examples and common mistakes</li>
                <li>• Exportable lesson notes</li>
              </ul>
            </div>
          </div>
        </header>

        <TopicInput value={topic} onChange={(event) => setTopic(event.target.value)} onSubmit={handleSubmit} loading={loading} />

        {loading && <LoadingTeacher />}

        {error && (
          <div className="rounded-3xl border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-300">
            {error}
          </div>
        )}

        {!loading && !lesson && !error && (
          <div className="rounded-3xl border border-slate-800/70 bg-slate-900/70 p-6 text-slate-400 shadow-2xl shadow-slate-950/40">
            <div className="flex items-center gap-3">
              <BookOpenText className="h-5 w-5 text-indigo-400" />
              Enter a topic such as “React Hooks”, “Quantum Computing”, or “Marketing Strategy” to begin.
            </div>
          </div>
        )}

        {lesson && (
          <div className="space-y-6">
            <section className="rounded-[2rem] border border-slate-800/70 bg-slate-900/70 p-6 shadow-2xl shadow-slate-950/40">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.25em] text-indigo-300">Teacher lesson</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">{lesson.title}</h2>
                  <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">{lesson.summary}</p>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-950/70 px-3 py-2 text-sm text-slate-300">
                  <RefreshCw className="h-4 w-4 text-cyan-400" />
                  Difficulty: {lesson.difficulty}
                </div>
              </div>
            </section>

            <div className="grid gap-4 xl:grid-cols-3">
              <TeacherCard
                title="Beginner"
                description="Start with the core idea"
                content={lesson.beginner}
                icon={BookOpenText}
                onCopy={() => copyText(lesson.beginner)}
                onDownload={() => downloadText(`${lesson.topic || 'lesson'}-beginner`, lesson.beginner)}
              />
              <TeacherCard
                title="Intermediate"
                description="Understand the working layer"
                content={lesson.intermediate}
                icon={Lightbulb}
                onCopy={() => copyText(lesson.intermediate)}
                onDownload={() => downloadText(`${lesson.topic || 'lesson'}-intermediate`, lesson.intermediate)}
              />
              <TeacherCard
                title="Advanced"
                description="See deeper nuance and application"
                content={lesson.advanced}
                icon={Sparkles}
                onCopy={() => copyText(lesson.advanced)}
                onDownload={() => downloadText(`${lesson.topic || 'lesson'}-advanced`, lesson.advanced)}
              />
            </div>

            <TeacherSection title="Examples" description="Helpful real-world examples to anchor the lesson.">
              <div className="grid gap-3 md:grid-cols-2">
                {lesson.examples.map((example, index) => (
                  <div key={index} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-sm leading-7 text-slate-300">
                    {example}
                  </div>
                ))}
              </div>
            </TeacherSection>

            <div className="grid gap-6 lg:grid-cols-2">
              <TeacherSection title="Important Points" description="Keep these in mind while studying.">
                <ul className="space-y-3 text-sm leading-7 text-slate-300">
                  {lesson.importantPoints.map((point, index) => (
                    <li key={index} className="flex gap-2 rounded-2xl border border-slate-800 bg-slate-950/70 p-3">
                      <BookOpenText className="mt-1 h-4 w-4 text-cyan-400" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </TeacherSection>

              <TeacherSection title="Common Mistakes" description="Avoid these errors while practicing.">
                <ul className="space-y-3 text-sm leading-7 text-slate-300">
                  {lesson.commonMistakes.map((mistake, index) => (
                    <li key={index} className="flex gap-2 rounded-2xl border border-slate-800 bg-slate-950/70 p-3">
                      <AlertTriangle className="mt-1 h-4 w-4 text-amber-400" />
                      <span>{mistake}</span>
                    </li>
                  ))}
                </ul>
              </TeacherSection>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
