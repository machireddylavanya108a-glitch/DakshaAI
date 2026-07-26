export default function SkillHeader({ title, subtitle }) {
  return (
    <div className="rounded-[2rem] border border-slate-800/70 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/70 p-8 shadow-2xl shadow-slate-950/40">
      <p className="text-sm uppercase tracking-[0.3em] text-indigo-300">Professional Skill Academy</p>
      <h2 className="mt-3 text-3xl font-semibold text-white">{title}</h2>
      <p className="mt-3 max-w-2xl text-base leading-7 text-slate-400">{subtitle}</p>
    </div>
  );
}
