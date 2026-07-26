import { BadgeCheck } from 'lucide-react';
import CertificateTemplate from './CertificateTemplate';

export default function CertificatePreview({ certificate }) {
  if (!certificate) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-cyan-300"><BadgeCheck className="h-4 w-4" /> Certificate Preview</div>
      <CertificateTemplate certificate={certificate} />
    </div>
  );
}
