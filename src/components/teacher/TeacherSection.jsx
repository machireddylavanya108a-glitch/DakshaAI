export default function TeacherSection({ title, description, children }) {
  return (
    <section className="rounded-3xl border border-slate-800/70 bg-slate-900/70 p-6 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
      <div className="mb-5">
        <h2 className="text-2xl font-semibold text-white">{title}</h2>
        {description && <p className="mt-2 text-sm text-slate-400">{description}</p>}
      </div>
      {children}
    </section>
  );
}
