import { Eye } from 'lucide-react';

export default function CertificateViewer({ certificate }) {
  if (!certificate) return null;

  return (
    <div className="rounded-[1rem] border border-white/10 bg-slate-950/70 p-4 text-sm text-slate-400">
      <div className="flex items-center gap-2 text-cyan-300"><Eye className="h-4 w-4" /> Preview</div>
      <p className="mt-3 text-white">{certificate.studentName}</p>
      <p className="mt-1">Certificate ID: {certificate.certificateId}</p>
      <p className="mt-1">Verification Code: {certificate.verificationCode}</p>
    </div>
  );
}
