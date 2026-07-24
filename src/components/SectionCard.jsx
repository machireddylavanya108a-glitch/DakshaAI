import { motion } from 'framer-motion'

export default function SectionCard({ title, description, accent }) {
  return (
    <motion.div
      className="section-card rounded-[2rem] border border-white/10 bg-slate-950/80 p-8 shadow-[0_40px_100px_rgba(15,23,42,0.25)] backdrop-blur-3xl"
      initial={{ opacity: 0, y: 70 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
    >
      <div className={`mb-5 inline-flex rounded-full px-4 py-2 text-sm font-semibold ${accent}`}>{title}</div>
      <p className="text-slate-300 leading-7">{description}</p>
    </motion.div>
  )
}
