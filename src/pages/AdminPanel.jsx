import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, BellRing, BookOpen, BrainCircuit, Building2, Database, FileText, KeyRound, LayoutGrid, Lock, MessageSquareMore, ShieldCheck, Sparkles, Users, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase/firebaseConfig';
import { collection, getDocs, setDoc, doc, serverTimestamp, addDoc } from 'firebase/firestore';
import AdminDashboard from '../components/admin/AdminDashboard';
import UsersManager from '../components/admin/UsersManager';
import UserProfile from '../components/admin/UserProfile';
import RolesManager from '../components/admin/RolesManager';
import PermissionsManager from '../components/admin/PermissionsManager';
import CoursesManager from '../components/admin/CoursesManager';
import ContentManager from '../components/admin/ContentManager';
import DocumentsManager from '../components/admin/DocumentsManager';
import MediaManager from '../components/admin/MediaManager';
import QuizManager from '../components/admin/QuizManager';
import FlashcardsManager from '../components/admin/FlashcardsManager';
import CertificatesManager from '../components/admin/CertificatesManager';
import AnalyticsDashboard from '../components/admin/AnalyticsDashboard';
import RevenueDashboard from '../components/admin/RevenueDashboard';
import SubscriptionsManager from '../components/admin/SubscriptionsManager';
import PaymentsManager from '../components/admin/PaymentsManager';
import ReportsManager from '../components/admin/ReportsManager';
import ModerationPanel from '../components/admin/ModerationPanel';
import NotificationsManager from '../components/admin/NotificationsManager';
import LogsViewer from '../components/admin/LogsViewer';
import AuditTrail from '../components/admin/AuditTrail';
import SystemHealth from '../components/admin/SystemHealth';
import ServerStatus from '../components/admin/ServerStatus';
import BackupManager from '../components/admin/BackupManager';
import AIModelManager from '../components/admin/AIModelManager';
import APIKeysManager from '../components/admin/APIKeysManager';
import FeatureFlags from '../components/admin/FeatureFlags';
import SettingsPanel from '../components/admin/SettingsPanel';
import LoadingAdmin from '../components/admin/LoadingAdmin';

const sections = [
  { key: 'overview', label: 'Overview', icon: LayoutGrid },
  { key: 'users', label: 'Users', icon: Users },
  { key: 'roles', label: 'Roles', icon: ShieldCheck },
  { key: 'content', label: 'Content', icon: BookOpen },
  { key: 'ai', label: 'AI', icon: BrainCircuit },
  { key: 'analytics', label: 'Analytics', icon: Sparkles },
  { key: 'billing', label: 'Billing', icon: Building2 },
  { key: 'moderation', label: 'Moderation', icon: MessageSquareMore },
  { key: 'security', label: 'Security', icon: Lock },
  { key: 'operations', label: 'Operations', icon: Database },
];

export default function AdminPanel() {
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const initializeAdminData = async () => {
      try {
        setLoading(true);
        const collections = ['adminLogs', 'systemMetrics', 'platformSettings', 'featureFlags'];
        for (const name of collections) {
          const snapshot = await getDocs(collection(db, name));
          if (snapshot.empty) {
            await setDoc(doc(db, name, `${name}-seed`), {
              initializedAt: serverTimestamp(),
              createdBy: user?.email || 'system',
              status: 'ready',
            });
          }
        }
        await addDoc(collection(db, 'adminLogs'), {
          event: 'admin-panel-opened',
          user: user?.email || 'unknown',
          createdAt: serverTimestamp(),
        });
        setError('');
      } catch (err) {
        console.error(err);
        setError('Unable to initialize platform data. Some controls are operating in offline-safe mode.');
      } finally {
        setLoading(false);
      }
    };

    initializeAdminData();
  }, [user]);

  const content = useMemo(() => {
    switch (activeSection) {
      case 'users':
        return (
          <div className="space-y-6">
            <UsersManager />
            <UserProfile />
          </div>
        );
      case 'roles':
        return (
          <div className="space-y-6">
            <RolesManager />
            <PermissionsManager />
          </div>
        );
      case 'content':
        return (
          <div className="space-y-6">
            <CoursesManager />
            <ContentManager />
            <DocumentsManager />
            <MediaManager />
            <QuizManager />
            <FlashcardsManager />
            <CertificatesManager />
          </div>
        );
      case 'ai':
        return (
          <div className="space-y-6">
            <AIModelManager />
            <APIKeysManager />
            <FeatureFlags />
          </div>
        );
      case 'analytics':
        return (
          <div className="space-y-6">
            <AnalyticsDashboard />
            <RevenueDashboard />
            <ReportsManager />
          </div>
        );
      case 'billing':
        return (
          <div className="space-y-6">
            <SubscriptionsManager />
            <PaymentsManager />
          </div>
        );
      case 'moderation':
        return <ModerationPanel />;
      case 'security':
        return (
          <div className="space-y-6">
            <LogsViewer />
            <AuditTrail />
            <SystemHealth />
          </div>
        );
      case 'operations':
        return (
          <div className="space-y-6">
            <ServerStatus />
            <BackupManager />
            <SettingsPanel />
            <NotificationsManager />
          </div>
        );
      default:
        return <AdminDashboard />;
    }
  }, [activeSection]);

  if (loading) return <LoadingAdmin />;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.18),_transparent_35%),linear-gradient(135deg,#020617,#111827_55%,#020617)] px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-cyan-950/30 backdrop-blur-xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-sm text-cyan-200">
                <ShieldCheck className="h-4 w-4" /> Enterprise Admin Panel
              </div>
              <h1 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">Professional operations control for Daksha AI</h1>
              <p className="mt-3 max-w-2xl text-sm text-slate-400 sm:text-base">Govern users, content, AI services, analytics, subscriptions, security, and platform operations from a premium glassmorphism workspace.</p>
            </div>
            <div className="rounded-[1.5rem] border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">
              <div className="flex items-center gap-2"><Zap className="h-4 w-4 text-cyan-300" /> Online • Secure • Responsive</div>
            </div>
          </div>
        </div>

        {error ? (
          <div className="rounded-[1.5rem] border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-200">
            <div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> {error}</div>
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-4 shadow-2xl shadow-slate-950/30 backdrop-blur-xl">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-cyan-200">
              <LayoutGrid className="h-4 w-4" /> Admin Navigation
            </div>
            <nav className="space-y-2">
              {sections.map((section) => {
                const Icon = section.icon;
                return (
                  <button
                    key={section.key}
                    onClick={() => setActiveSection(section.key)}
                    className={`flex w-full items-center gap-3 rounded-[1rem] px-3 py-3 text-left text-sm transition ${activeSection === section.key ? 'bg-cyan-500/15 text-cyan-100' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}
                  >
                    <Icon className="h-4 w-4" /> {section.label}
                  </button>
                );
              })}
            </nav>
          </aside>

          <main className="space-y-6">
            {content}
          </main>
        </div>
      </div>
    </div>
  );
}
