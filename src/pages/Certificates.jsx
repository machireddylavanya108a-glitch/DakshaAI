import { useEffect, useMemo, useState } from 'react';
import { addDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { Award, Sparkles, Download, ShieldCheck, Share2, Search, Trophy, BookOpen, Zap, BadgeCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase/firebaseConfig';
import CertificateDashboard from '../components/certificates/CertificateDashboard';
import CertificateGenerator from '../components/certificates/CertificateGenerator';
import CertificatePreview from '../components/certificates/CertificatePreview';
import CertificateDownload from '../components/certificates/CertificateDownload';
import CertificateVerification from '../components/certificates/CertificateVerification';
import CertificateHistory from '../components/certificates/CertificateHistory';
import CertificateAnalytics from '../components/certificates/CertificateAnalytics';
import CertificateShare from '../components/certificates/CertificateShare';
import LoadingCertificate from '../components/certificates/LoadingCertificate';

const STORAGE_KEY = 'daksha-certificates';

function generateCertificateData(form) {
  const certificateId = `CERT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const verificationCode = `VER-${Math.floor(100000 + Math.random() * 900000)}`;
  const issueDate = new Date().toLocaleDateString();
  const completionDate = new Date().toLocaleDateString();

  return {
    certificateId,
    verificationCode,
    issueDate,
    completionDate,
    studentName: form.studentName || 'Learner',
    courseName: form.courseName || 'Universal Learning Achievement',
    duration: form.duration || 'Flexible',
    score: form.score || 92,
    grade: form.score >= 90 ? 'A+' : form.score >= 80 ? 'A' : form.score >= 70 ? 'B' : 'C',
    skills: form.skills || ['Learning', 'Practice', 'Problem Solving'],
    instructor: form.instructor || 'Daksha AI',
    template: form.template || 'Modern',
    verificationLink: `https://daksha.ai/verify/${certificateId}`,
    certificateType: form.certificateType || 'Achievement',
    qrValue: `${certificateId}-${verificationCode}`,
    description: `Awarded for successful completion of ${form.courseName || 'a learning pathway'} with excellent performance.`
  };
}

export default function Certificates() {
  const { user } = useAuth();
  const [form, setForm] = useState({ studentName: 'Learner', courseName: 'Universal AI Learning Pathway', duration: '4 Weeks', score: 92, skills: ['AI', 'Problem Solving', 'Research'], instructor: 'Daksha AI', template: 'Modern', certificateType: 'Achievement' });
  const [certificate, setCertificate] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [verificationQuery, setVerificationQuery] = useState('');
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [downloadState, setDownloadState] = useState('Ready');

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const loadHistory = async () => {
      if (!user?.uid) {
        const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        setHistory(stored);
        return;
      }

      try {
        const q = query(collection(db, 'certificates'), where('userId', '==', user.uid));
        const snapshot = await getDocs(q);
        const items = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setHistory(items);
      } catch (error) {
        console.error('Unable to load certificates:', error);
        setOffline(true);
        const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        setHistory(stored);
      }
    };

    loadHistory();
  }, [user?.uid]);

  const generateCertificate = () => {
    const generated = generateCertificateData(form);
    setCertificate(generated);
    setDownloadState('Ready to download');
  };

  const saveCertificate = async () => {
    if (!certificate) return;

    const entry = {
      userId: user?.uid || 'local',
      certificateId: certificate.certificateId,
      courseName: certificate.courseName,
      certificateType: certificate.certificateType,
      score: certificate.score,
      grade: certificate.grade,
      skills: certificate.skills,
      verificationCode: certificate.verificationCode,
      issueDate: certificate.issueDate,
      createdAt: new Date()
    };

    try {
      if (user?.uid) {
        await addDoc(collection(db, 'certificates'), entry);
      }
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      const nextHistory = [entry, ...stored].slice(0, 6);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextHistory));
      setHistory(nextHistory);
      setOffline(false);
      setDownloadState('Saved and ready');
    } catch (error) {
      console.error('Unable to save certificate:', error);
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      const nextHistory = [entry, ...stored].slice(0, 6);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextHistory));
      setHistory(nextHistory);
      setOffline(true);
      setDownloadState('Saved locally');
    }
  };

  const verifyCertificate = () => {
    const match = history.find((item) => item.certificateId === verificationQuery || item.verificationCode === verificationQuery);
    if (match) {
      setVerificationStatus({ valid: true, item: match });
    } else {
      setVerificationStatus({ valid: false, item: null });
    }
  };

  const stats = useMemo(() => ({
    total: history.length,
    downloaded: history.filter((item) => item.downloaded).length,
    shared: history.filter((item) => item.shared).length,
    verified: history.filter((item) => item.verificationCode).length
  }), [history]);

  if (loading) return <LoadingCertificate />;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(45,212,191,0.2),_transparent_35%),linear-gradient(135deg,_#020617_0%,_#0f172a_45%,_#111827_100%)] px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-cyan-300">Universal AI Certification Platform</p>
              <h1 className="mt-2 text-3xl font-semibold text-white sm:text-4xl">Issue globally verifiable certificates for any completed pathway</h1>
              <p className="mt-3 max-w-2xl text-sm text-slate-400 sm:text-base">Generate, download, verify, and share personalized certificates automatically for every achievement inside Daksha AI.</p>
            </div>
            <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100">
              <div className="flex items-center gap-2"><Sparkles className="h-4 w-4" /> AI certificate engine</div>
            </div>
          </div>
        </div>

        {offline ? <div className="rounded-[1.5rem] border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-300">Offline mode active. Certificates will be saved locally until connectivity is restored.</div> : null}

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-4 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
              <CertificateDashboard form={form} onChange={setForm} onGenerate={generateCertificate} onSave={saveCertificate} />
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-4 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
              <CertificateGenerator certificate={certificate} onGenerate={generateCertificate} />
            </div>

            {certificate ? (
              <div className="space-y-6">
                <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-4 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
                  <CertificatePreview certificate={certificate} />
                </div>
                <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-4 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
                  <CertificateDownload certificate={certificate} onDownload={() => setDownloadState('Downloaded')} />
                </div>
                <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-4 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
                  <CertificateShare certificate={certificate} />
                </div>
              </div>
            ) : null}
          </div>

          <div className="space-y-6">
            <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-5 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
              <div className="flex items-center gap-2 text-cyan-300"><Trophy className="h-4 w-4" /> Achievements</div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {['Gold Certificate', 'Silver Certificate', 'Bronze Certificate', 'Distinction', 'Merit', 'Perfect Score', 'Expert Level', 'Master Level'].map((item) => (
                  <div key={item} className="rounded-[1rem] border border-white/10 bg-slate-950/70 p-3 text-sm text-slate-300">{item}</div>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-5 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
              <CertificateVerification verificationQuery={verificationQuery} onChange={setVerificationQuery} onVerify={verifyCertificate} status={verificationStatus} />
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-5 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
              <CertificateAnalytics stats={stats} />
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-5 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
              <CertificateHistory history={history} />
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-5 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
              <div className="flex items-center gap-2 text-cyan-300"><BookOpen className="h-4 w-4" /> Dashboard Snapshot</div>
              <div className="mt-4 space-y-2 text-sm text-slate-400">
                <div className="rounded-[1rem] border border-white/10 bg-slate-950/70 p-3">My Certificates: {stats.total}</div>
                <div className="rounded-[1rem] border border-white/10 bg-slate-950/70 p-3">Downloaded Certificates: {stats.downloaded}</div>
                <div className="rounded-[1rem] border border-white/10 bg-slate-950/70 p-3">Shared Certificates: {stats.shared}</div>
                <div className="rounded-[1rem] border border-white/10 bg-slate-950/70 p-3">Verification Status: {verificationStatus?.valid ? 'Verified' : 'Pending'}</div>
                <div className="rounded-[1rem] border border-white/10 bg-slate-950/70 p-3">Download Status: {downloadState}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
