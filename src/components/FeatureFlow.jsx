import { motion } from 'framer-motion'
import SectionCard from './SectionCard'

const sections = [
  {
    title: 'Universal Scanner',
    description: 'Scan documents, images, audio, and handwritten notes with a single AI-native workflow that understands knowledge structure instantly.',
    accent: 'bg-cyan-500/10 text-cyan-200',
  },
  {
    title: 'Knowledge Engine',
    description: 'A semantic engine that connects every concept, generates summaries, and delivers personalized learning paths tailored to your goals.',
    accent: 'bg-indigo-500/10 text-indigo-200',
  },
  {
    title: 'AI Teacher',
    description: 'Talk, ask, and learn with a human-like AI tutor that supports voice conversations, translations, and deep reasoning in real time.',
    accent: 'bg-violet-500/10 text-violet-200',
  },
  {
    title: '3D Learning',
    description: 'Immersive 3D simulations, interactive labs, and dynamic visual explanations that make complex topics feel effortless.',
    accent: 'bg-sky-500/10 text-sky-200',
  },
  {
    title: 'Voice AI',
    description: 'Instant speech recognition, multilingual responses, and guided coaching with studio-grade audio clarity.',
    accent: 'bg-fuchsia-500/10 text-fuchsia-200',
  },
  {
    title: 'Skill Academy',
    description: 'Adaptive practice sessions, mastery checks, and project-based learning for careers, certifications, and future-ready skills.',
    accent: 'bg-emerald-500/10 text-emerald-200',
  },
  {
    title: '100+ Languages',
    description: 'Global fluency unlocked by real-time translation, multilingual tutoring, and culture-aware learning support.',
    accent: 'bg-sky-500/10 text-sky-200',
  },
  {
    title: 'Personalized Learning',
    description: 'A learning experience that adapts to your pace, preferences, and strengths with AI memory and smart recommendations.',
    accent: 'bg-amber-500/10 text-amber-200',
  },
]

export default function FeatureFlow() {
  return (
    <section className="relative overflow-hidden bg-[#020617] py-24 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.12),transparent_18%),radial-gradient(circle_at_bottom_right,_rgba(168,85,247,0.14),transparent_20%)]" />
      <div className="absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-slate-950/90 to-transparent" />
      <div className="relative mx-auto max-w-7xl px-6 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 36 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="mb-14 max-w-3xl"
        >
          <p className="text-sm uppercase tracking-[0.35em] text-cyan-300">Explore the future of learning</p>
          <h2 className="mt-4 text-4xl font-semibold text-white sm:text-5xl">A premium suite of AI-powered learning systems</h2>
          <p className="mt-5 max-w-2xl text-base leading-8 text-slate-400">
            Each module is designed to guide you from curiosity to mastery with cinematic interactions, adaptive feedback, and endless intelligence.
          </p>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {sections.map((section) => (
            <SectionCard key={section.title} title={section.title} description={section.description} accent={section.accent} />
          ))}
        </div>
      </div>
    </section>
  )
}
