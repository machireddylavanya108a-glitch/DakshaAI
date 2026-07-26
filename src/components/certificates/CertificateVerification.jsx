import { ShieldCheck, Search } from 'lucide-react';

export default function CertificateVerification({ verificationQuery, onChange, onVerify, status }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-cyan-300"><ShieldCheck className="h-4 w-4" /> Verification</div>
      <div className="rounded-[1rem] border border-white/10 bg-slate-950/70 p-4 text-sm text-slate-400">
        <div className="flex gap-2">
          <input value={verificationQuery} onChange={(event) => onChange(event.target.value)} placeholder="Enter certificate ID or verification code" className="flex-1 rounded-[0.8rem] border border-white/10 bg-slate-900 px-3 py-2 text-slate-100 outline-none" />
          <button onClick={onVerify} className="rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950">Verify</button>
        </div>
        <div className="mt-3 rounded-[0.8rem] border border-white/10 bg-slate-900/80 p-3">
          {status ? (status.valid ? <div className="text-cyan-300">Valid certificate found.</div> : <div className="text-amber-300">Certificate could not be verified.</div>) : <div className="text-slate-400">Use the unique verification page, QR check, or ID search to validate authenticity.</div>}
        </div>
      </div>
    </div>
  );
}
