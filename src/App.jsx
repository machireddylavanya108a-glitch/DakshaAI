import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import RequireAuth from './components/RequireAuth';
import AdminRoute from './components/AdminRoute';
import OSLayout from './layouts/OSLayout';

const Home = lazy(() => import('./pages/Home'));
const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Chat = lazy(() => import('./pages/Chat'));
const Scanner = lazy(() => import('./pages/Scanner'));
const Academy = lazy(() => import('./pages/Academy'));
const Quiz = lazy(() => import('./pages/Quiz'));
const Flashcards = lazy(() => import('./pages/Flashcards'));
const PDFLearning = lazy(() => import('./pages/PDFLearning'));
const DOCXLearning = lazy(() => import('./pages/DOCXLearning'));
const PPTLearning = lazy(() => import('./pages/PPTLearning'));
const YouTubeLearning = lazy(() => import('./pages/YouTubeLearning'));
const Profile = lazy(() => import('./pages/Profile'));
const NotFound = lazy(() => import('./pages/NotFound'));
const Learn3D = lazy(() => import('./pages/Learn3D'));
const Admin = lazy(() => import('./pages/Admin'));

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
              <Route path="/scanner" element={<Scanner />} />
              <Route path="/academy" element={<Academy />} />
              <Route path="/quiz" element={<Quiz />} />
              <Route path="/flashcards" element={<Flashcards />} />
              <Route path="/pdf-learning" element={<PDFLearning />} />
              <Route path="/docx-learning" element={<DOCXLearning />} />
              <Route path="/ppt-learning" element={<PPTLearning />} />
              <Route path="/youtube-learning" element={<YouTubeLearning />} />
              <Route path="/3d-learning" element={<Learn3D />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}
