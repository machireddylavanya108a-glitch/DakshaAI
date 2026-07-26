import { useEffect, useMemo, useState } from 'react';
import { Smartphone, Tablet, MonitorSmartphone, Sparkles, WifiOff, Download, ShieldCheck, Zap } from 'lucide-react';
import ResponsiveLayout from '../components/mobile/ResponsiveLayout';
import MobileNavigation from '../components/mobile/MobileNavigation';
import BottomNavigation from '../components/mobile/BottomNavigation';
import TabletLayout from '../components/mobile/TabletLayout';
import DesktopLayout from '../components/mobile/DesktopLayout';
import AdaptiveSidebar from '../components/mobile/AdaptiveSidebar';
import FloatingToolbar from '../components/mobile/FloatingToolbar';
import GestureHandler from '../components/mobile/GestureHandler';
import OfflineBanner from '../components/mobile/OfflineBanner';
import NetworkStatus from '../components/mobile/NetworkStatus';
import PerformanceMonitor from '../components/mobile/PerformanceMonitor';
import LoadingSkeleton from '../components/mobile/LoadingSkeleton';

export default function MobileOptimization() {
  const [loading, setLoading] = useState(true);
  const [deviceType, setDeviceType] = useState('mobile');
  const [offline, setOffline] = useState(false);
  const [performance, setPerformance] = useState('Excellent');

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const checkDevice = () => {
      const width = window.innerWidth;
      if (width < 640) setDeviceType('mobile');
      else if (width < 1024) setDeviceType('tablet');
      else if (width < 1536) setDeviceType('desktop');
      else setDeviceType('ultrawide');
    };

    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  const deviceIcon = useMemo(() => {
    switch (deviceType) {
      case 'tablet': return <Tablet className="h-5 w-5" />;
      case 'desktop':
      case 'ultrawide': return <MonitorSmartphone className="h-5 w-5" />;
      default: return <Smartphone className="h-5 w-5" />;
    }
  }, [deviceType]);

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.16),_transparent_30%),linear-gradient(135deg,_#020617_0%,_#0f172a_45%,_#111827_100%)] px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-cyan-300">Mobile-First AI Platform</p>
              <h1 className="mt-2 text-3xl font-semibold text-white sm:text-4xl">Premium cross-device experience for phones, tablets, desktops, and future devices</h1>
              <p className="mt-3 max-w-2xl text-sm text-slate-400 sm:text-base">Adaptive layouts, touch gestures, offline support, performance tuning, accessibility, and PWA readiness are all built in.</p>
            </div>
            <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-3 text-sm text-cyan-100">
              <div className="flex items-center gap-2"><Sparkles className="h-4 w-4" /> Responsive AI experience</div>
            </div>
          </div>
        </div>

        {offline ? <OfflineBanner /> : <NetworkStatus />}

        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-6">
            <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-4 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
              <ResponsiveLayout deviceType={deviceType} />
            </div>
            <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-4 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
              <MobileNavigation deviceType={deviceType} />
            </div>
            <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-4 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
              <AdaptiveSidebar deviceType={deviceType} />
            </div>
            <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-4 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
              <GestureHandler />
            </div>
            <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-4 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
              <PerformanceMonitor performance={performance} />
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-4 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
              <BottomNavigation deviceType={deviceType} />
            </div>
            <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-4 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
              <TabletLayout deviceType={deviceType} />
            </div>
            <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-4 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
              <DesktopLayout deviceType={deviceType} />
            </div>
            <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-4 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
              <FloatingToolbar />
            </div>
            <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-4 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
              <div className="space-y-3 text-sm text-slate-300">
                <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-emerald-300" /> Accessibility ready</div>
                <div className="flex items-center gap-2"><Zap className="h-4 w-4 text-cyan-300" /> Performance optimized</div>
                <div className="flex items-center gap-2"><Download className="h-4 w-4 text-violet-300" /> PWA and offline support</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
