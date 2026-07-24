import { motion } from 'framer-motion'

export default function TimelineStep({ step, title, details }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 60 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.7, ease: 'easeOut' }}
      className="relative rounded-[2rem] border border-white/10 bg-slate-900/90 p-8 shadow-[0_40px_80px_rgba(15,23,42,0.3)]"
    >
      <div className="mb-4 inline-flex items-center justify-center rounded-full bg-indigo-500/10 px-4 py-2 text-sm font-semibold text-indigo-200">
        STEP {step}
      </div>
      <h3 className="text-2xl font-semibold text-white mb-4">{title}</h3>
      <p className="text-slate-400 leading-7">{details}</p>
    </motion.div>
  )
}
