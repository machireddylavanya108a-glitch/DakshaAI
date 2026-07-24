import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Play, ChevronDown } from 'lucide-react'
import HeroSpline from './HeroSpline'

const stats = [
  { label: '100+ languages', value: 'Global' },
  { label: 'Realtime voice AI', value: 'Instant' },
  { label: 'AI Teachers', value: 'Unlimited' },
]

export default function HeroSection() {
  const [pointer, setPointer] = useState({ x: 0.5, y: 0.5 })

  useEffect(() => {
    const handleMove = (event) => {
      setPointer({ x: event.clientX / window.innerWidth, y: event.clientY / window.innerHeight })
    }

    window.addEventListener('mousemove', handleMove)
    return () => window.removeEventListener('mousemove', handleMove)
  }, [])

  const transformStyles = useMemo(() => {
    const x = (pointer.x - 0.5) * 12
    const y = (pointer.y - 0.5) * 10

    return {
      transform: `perspective(1200px) translateZ(0px) rotateY(${x}deg) rotateX(${y}deg)`,
    }
  }, [pointer])

  return (
    <section className="relative overflow-hidden bg-[#020617] text-white">
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      >
        <source src="/videos/hero2.mp4" type="video/mp4" />
      </video>

      <div className="absolute inset-0 bg-black/70" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.24),_transparent_16%),radial-gradient(circle_at_bottom_right,_rgba(168,85,247,0.24),_transparent_18%)]" />
      <div className="absolute inset-x-0 top-0 h-44 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),_transparent_28%)]" />
      <div className="absolute inset-x-0 bottom-0 h-48 bg-[radial-gradient(circle_at_bottom,_rgba(168,85,247,0.18),_transparent_34%)]" />
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(135deg,_rgba(255,255,255,0.08),_transparent_32%)]" />
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_20%_20%,_rgba(96,165,250,0.08),_transparent_20%),radial-gradient(circle_at_80%_15%,_rgba(168,85,247,0.08),_transparent_22%)]" />

      <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col gap-12 px-6 py-10 lg:px-12 lg:py-16">
        <div className="pointer-events-none absolute left-1/2 top-16 h-60 w-60 -translate-x-1/2 rounded-full bg-cyan-400/10 blur-3xl opacity-90" />
        <div className="pointer-events-none absolute right-16 top-28 h-44 w-44 rounded-full bg-violet-500/10 blur-3xl opacity-80" />
        <div className="pointer-events-none absolute left-12 bottom-24 h-56 w-56 rounded-full bg-indigo-400/10 blur-3xl opacity-80" />

        <div className="grid min-h-[calc(100vh-5rem)] gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div className="relative z-10 space-y-8">
            <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.35em] text-cyan-200 backdrop-blur-xl shadow-glass">
              Premium AI Learning • Futuristic 3D Studio
            </div>

            <motion.div
              initial={{ opacity: 0, y: 64 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
              className="space-y-6"
            >
              <h1 className="text-5xl font-semibold leading-tight tracking-[-0.05em] text-white sm:text-6xl lg:text-7xl">
                <span className="block bg-gradient-to-r from-cyan-300 via-indigo-300 to-violet-400 bg-clip-text text-transparent">Learn Anything.</span>
                <span className="block bg-gradient-to-r from-slate-100 via-slate-300 to-white bg-clip-text text-transparent">Become Anything.</span>
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-slate-300 sm:text-xl">
                Daksha AI can teach anything a human can learn. Learn using AI Teachers, 3D Simulations, Interactive Labs, Voice Conversations, Real-time Translation, and Personalized Learning.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 52 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 1.1, ease: 'easeOut' }}
              className="flex flex-col gap-4 sm:flex-row"
            >
              <a href="/login" className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500 px-8 py-4 text-base font-semibold text-slate-950 shadow-[0_24px_80px_rgba(56,189,248,0.35)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_30px_90px_rgba(56,189,248,0.45)]">
                Start Learning
              </a>
              <a href="/chat" className="inline-flex items-center justify-center gap-3 rounded-full border border-white/15 bg-white/5 px-8 py-4 text-base font-semibold text-white transition duration-300 hover:border-cyan-300 hover:text-cyan-200">
                <Play className="h-4 w-4" />
                Watch Demo
              </a>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 48 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 1.15, ease: 'easeOut' }}
              className="grid gap-4 rounded-[2rem] border border-white/10 bg-slate-950/75 p-6 shadow-glass backdrop-blur-3xl sm:grid-cols-3"
            >
              {stats.map((item) => (
                <div key={item.label} className="space-y-1 text-left">
                  <p className="text-3xl font-semibold text-white">{item.value}</p>
                  <p className="text-sm uppercase tracking-[0.35em] text-slate-400">{item.label}</p>
                </div>
              ))}
            </motion.div>
          </div>

          <motion.div
            style={transformStyles}
            initial={{ opacity: 0, y: 80, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 1.3, ease: 'easeOut' }}
            className="relative"
          >
            <div className="absolute -inset-4 rounded-[2.5rem] bg-gradient-to-r from-cyan-400/20 via-transparent to-violet-400/20 blur-3xl opacity-80" />
            <HeroSpline />
          </motion.div>
        </div>

        <div className="relative z-10 mx-auto flex w-full max-w-[28rem] flex-col items-center justify-center gap-4 rounded-[2rem] border border-white/10 bg-white/5 px-5 py-6 text-center text-sm text-slate-300 shadow-glass backdrop-blur-3xl sm:flex-row sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-3 w-3 rounded-full bg-cyan-400 shadow-[0_0_20px_rgba(56,189,248,0.45)]" />
            Realtime AI core powering on
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <span className="h-2 w-2 rounded-full bg-cyan-300/80" />
            Ready in 3s
          </div>
        </div>

        <div className="relative z-10 mx-auto flex w-full max-w-sm flex-col items-center gap-4 text-slate-300">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/5 shadow-glass backdrop-blur-3xl">
            <ChevronDown className="h-6 w-6 text-cyan-300 animate-bounce" />
          </div>
          <p className="text-sm uppercase tracking-[0.35em] text-slate-400">Scroll to discover Daksha AI</p>
        </div>
      </div>
    </section>
  )
}
