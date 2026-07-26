export default function LessonCards({ lessons = [] }) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {lessons.map((lesson, index) => (
        <div key={`${lesson.title}-${index}`} className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-5 shadow-2xl shadow-slate-950/40">
          <h3 className="text-lg font-semibold text-white">{lesson.title}</h3>
          <p className="mt-3 text-sm leading-7 text-slate-300">{lesson.content}</p>
        </div>
      ))}
    </div>
  );
}
