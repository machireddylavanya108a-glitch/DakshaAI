export default function SkillSection({ title, description, children }) {
  return (
    <section className="rounded-[2rem] border border-slate-800/70 bg-slate-900/70 p-6 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
      <div className="mb-5">
        <h3 className="text-xl font-semibold text-white">{title}</h3>
        {description && <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>}
      </div>
      {children}
    </section>
  );
}
