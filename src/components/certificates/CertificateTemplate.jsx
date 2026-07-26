import { BadgeCheck } from 'lucide-react';

export default function CertificateTemplate({ certificate }) {
  if (!certificate) return null;

  return (
    <div className="rounded-[1.5rem] border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 to-slate-950/80 p-6 text-center shadow-2xl shadow-slate-950/40">
      <div className="flex items-center justify-center gap-2 text-cyan-300"><BadgeCheck className="h-5 w-5" /> {certificate.template} Certificate</div>
      <h3 className="mt-4 text-2xl font-semibold text-white">{certificate.studentName}</h3>
      <p className="mt-2 text-sm text-slate-400">has successfully completed</p>
      <p className="mt-2 text-xl font-semibold text-cyan-200">{certificate.courseName}</p>
      <div className="mt-4 flex flex-wrap justify-center gap-2 text-sm text-slate-300">
        <span className="rounded-full border border-white/10 bg-slate-900/70 px-3 py-1">Score: {certificate.score}%</span>
        <span className="rounded-full border border-white/10 bg-slate-900/70 px-3 py-1">Grade: {certificate.grade}</span>
        <span className="rounded-full border border-white/10 bg-slate-900/70 px-3 py-1">Duration: {certificate.duration}</span>
      </div>
    </div>
  );
}
