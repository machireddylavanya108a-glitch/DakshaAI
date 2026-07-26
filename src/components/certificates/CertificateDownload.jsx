import { Download } from 'lucide-react';

export default function CertificateDownload({ certificate, onDownload }) {
  if (!certificate) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-cyan-300"><Download className="h-4 w-4" /> Download & Export</div>
      <div className="rounded-[1rem] border border-white/10 bg-slate-950/70 p-4 text-sm text-slate-400">
        <p className="text-white">Download formats: PDF, PNG, JPG, Print Ready, High Resolution</p>
        <p className="mt-2">Certificate ID: {certificate.certificateId}</p>
        <button onClick={onDownload} className="mt-3 rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950">Download Certificate</button>
      </div>
    </div>
  );
}
