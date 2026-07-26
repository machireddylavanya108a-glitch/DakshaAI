import { Share2 } from 'lucide-react';

export default function CertificateShare({ certificate }) {
  if (!certificate) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-cyan-300"><Share2 className="h-4 w-4" /> Share</div>
      <div className="rounded-[1rem] border border-white/10 bg-slate-950/70 p-4 text-sm text-slate-400">
        <p className="text-white">Shareable verification link</p>
        <p className="mt-2 break-all">{certificate.verificationLink}</p>
        <button className="mt-3 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-200">Copy Link</button>
      </div>
    </div>
  );
}
