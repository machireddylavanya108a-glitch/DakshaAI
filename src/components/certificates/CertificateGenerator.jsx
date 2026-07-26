import { Sparkles } from 'lucide-react';

export default function CertificateGenerator({ certificate, onGenerate }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-cyan-300"><Sparkles className="h-4 w-4" /> Certificate Generator</div>
      {certificate ? (
        <div className="rounded-[1rem] border border-white/10 bg-slate-950/70 p-4 text-sm text-slate-400">
          <p className="text-white">{certificate.courseName}</p>
          <p className="mt-2">Certificate ID: {certificate.certificateId}</p>
          <p className="mt-1">Verification: {certificate.verificationCode}</p>
          <p className="mt-1">Template: {certificate.template}</p>
          <p className="mt-1">Awarded Score: {certificate.score}%</p>
        </div>
      ) : (
        <div className="rounded-[1rem] border border-white/10 bg-slate-950/70 p-4 text-sm text-slate-400">No certificate generated yet. Fill the form and generate one to unlock issue details, verification, and download tooling.</div>
      )}
      <button onClick={onGenerate} className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-200">Create New Certificate</button>
    </div>
  );
}
