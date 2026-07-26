import { BadgeCheck } from 'lucide-react';

export default function CertificatePreview({ result }) {
  if (!result) return null;

  return (
    <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-5 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
      <div className="flex items-center gap-2 text-cyan-300"><BadgeCheck className="h-4 w-4" /> Certificate Preview</div>
      <div className="mt-4 rounded-[1rem] border border-cyan-500/20 bg-cyan-500/10 p-4 text-sm text-cyan-100">
        <p className="text-lg font-semibold text-white">Certificate of Achievement</p>
        <p className="mt-2">Awarded to the learner for completing {result.exam.subject} with {result.percentage}% proficiency.</p>
      </div>
    </div>
  );
}
