import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import RequireAuth from './components/RequireAuth';
import AdminRoute from './components/AdminRoute';
import OSLayout from './layouts/OSLayout';

const Home = lazy(() => import('./pages/Home'));
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Chat = lazy(() => import('./pages/Chat'));
const UniversalLearning = lazy(() => import('./pages/Scanner'));
const Academy = lazy(() => import('./pages/Academy'));
const Quiz = lazy(() => import('./pages/Quiz'));
const Flashcards = lazy(() => import('./pages/Flashcards'));
const MemoryDashboard = lazy(() => import('./pages/MemoryDashboard'));
const Profile = lazy(() => import('./pages/Profile'));
const NotFound = lazy(() => import('./pages/NotFound'));
const Learn3D = lazy(() => import('./pages/Learning3D'));
const VirtualLabs = lazy(() => import('./pages/VirtualLabs'));
const AITutor = lazy(() => import('./pages/AITutor'));
const PracticeMode = lazy(() => import('./pages/PracticeMode'));
const Examinations = lazy(() => import('./pages/Examinations'));
const Certificates = lazy(() => import('./pages/Certificates'));
const AINotes = lazy(() => import('./pages/AINotes'));
const MindMaps = lazy(() => import('./pages/MindMaps'));
const Whiteboard = lazy(() => import('./pages/Whiteboard'));
const KnowledgeLibrary = lazy(() => import('./pages/KnowledgeLibrary'));
const MobileOptimization = lazy(() => import('./pages/MobileOptimization'));
const Admin = lazy(() => import('./pages/Admin'));
const AdminPanel = lazy(() => import('./pages/AdminPanel'));
const Integrations = lazy(() => import('./pages/integrations/Integrations'));
const SettingsPage = lazy(() => import('./pages/Settings'));

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Suspense fallback={<div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">Loading...</div>}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route element={<RequireAuth><OSLayout /></RequireAuth>}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/learn" element={<UniversalLearning />} />
              <Route path="/academy" element={<Academy />} />
              <Route path="/quiz" element={<Quiz />} />
              <Route path="/flashcards" element={<Flashcards />} />
              <Route path="/memory-dashboard" element={<MemoryDashboard />} />
              <Route path="/3d-learning" element={<Learn3D />} />
              <Route path="/virtual-labs" element={<VirtualLabs />} />
              <Route path="/ai-tutor" element={<AITutor />} />
              <Route path="/practice" element={<PracticeMode />} />
              <Route path="/examinations" element={<Examinations />} />
              <Route path="/certificates" element={<Certificates />} />
              <Route path="/ai-notes" element={<AINotes />} />
              <Route path="/mind-maps" element={<MindMaps />} />
              <Route path="/whiteboard" element={<Whiteboard />} />
              <Route path="/knowledge-library" element={<KnowledgeLibrary />} />
              <Route path="/mobile-optimization" element={<MobileOptimization />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/integrations" element={<Integrations />} />
              <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
              <Route path="/admin-panel" element={<AdminRoute><AdminPanel /></AdminRoute>} />
              <Route path="/scanner" element={<Navigate to="/learn" replace />} />
              <Route path="/pdf-learning" element={<Navigate to="/learn" replace />} />
              <Route path="/docx-learning" element={<Navigate to="/learn" replace />} />
              <Route path="/ppt-learning" element={<Navigate to="/learn" replace />} />
              <Route path="/youtube-learning" element={<Navigate to="/learn" replace />} />
              <Route path="/website-learning" element={<Navigate to="/learn" replace />} />
              <Route path="/camera-learning" element={<Navigate to="/learn" replace />} />
              <Route path="/voice-teacher" element={<Navigate to="/learn" replace />} />
              <Route path="/app/*" element={<Navigate to="/dashboard" replace />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}
