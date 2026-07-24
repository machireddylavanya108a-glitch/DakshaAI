import { motion } from 'framer-motion'

export default function FeatureCard({ title, detail, accent }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.98 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.35 }}
      transition={{ duration: 0.7, ease: 'easeOut' }}
      className="group relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 p-8 shadow-[0_40px_120px_rgba(15,23,42,0.35)] backdrop-blur-2xl"
    >
      <div className={`mb-5 inline-flex rounded-3xl px-4 py-3 text-sm font-semibold ${accent}`}>
        {title}
      </div>
      <p className="text-slate-200 leading-7">{detail}</p>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.22),_transparent_28%)] opacity-0 transition duration-500 group-hover:opacity-100" />
    </motion.div>
  )
}
