import { lazy, Suspense, useEffect, useState } from 'react'

const Spline = lazy(() => import('@splinetool/react-spline'))

export default function HeroSpline() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <div className="relative isolate overflow-hidden rounded-[2.5rem] border border-white/10 bg-slate-950/70 shadow-[0_60px_120px_rgba(15,23,42,0.55)] backdrop-blur-3xl">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.26),_transparent_18%),radial-gradient(circle_at_bottom_right,_rgba(168,85,247,0.22),_transparent_24%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-12 left-1/2 h-44 w-44 -translate-x-1/2 rounded-full bg-cyan-400/10 blur-3xl opacity-80" />
      <div className="pointer-events-none absolute inset-x-0 bottom-14 left-1/2 h-52 w-52 -translate-x-1/2 rounded-full bg-violet-500/10 blur-3xl opacity-70" />
      {mounted ? (
        <Suspense fallback={<div className="grid h-full min-h-[28rem] place-items-center px-6 py-10 text-sm text-slate-300">Loading core visualization…</div>}>
          <Spline scene="https://prod.spline.design/KFonZGtsoUXP-qx7/scene.splinecode" />
        </Suspense>
      ) : (
        <div className="grid h-full min-h-[28rem] place-items-center px-6 py-10 text-sm text-slate-300">Preparing the 3D experience…</div>
      )}
      <div className="pointer-events-none absolute inset-0 rounded-[2.5rem] border border-white/10" />
    </div>
  )
}
