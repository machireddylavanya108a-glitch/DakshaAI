export default function CertificateCard({ certificate }) {
  if (!certificate) return null;

  return (
    <div className="rounded-[1rem] border border-white/10 bg-slate-950/70 p-4 text-sm text-slate-400">
      <p className="text-white">{certificate.courseName}</p>
      <p className="mt-2">{certificate.certificateType} • {certificate.grade}</p>
      <p className="mt-1">Issued: {certificate.issueDate}</p>
    </div>
  );
}
