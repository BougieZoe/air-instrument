import { motion } from "framer-motion";

export const GlassCard = ({ children, className = "" }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    className={`relative overflow-hidden rounded-sm border border-white/5 bg-white/[0.02] p-10 backdrop-blur-2xl transition-all duration-500 hover:border-white/20 hover:bg-white/[0.04] ${className}`}
  >
    {children}
  </motion.div>
);

export const SectionHeader = ({ eyebrow, title, subtitle }) => (
  <div className="mb-24 space-y-6">
    {eyebrow && (
      <motion.p
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        className="font-mono text-[10px] uppercase tracking-[0.4em]"
        style={{ color: 'rgba(200,196,188,0.5)' }}
      >
        {eyebrow}
      </motion.p>
    )}
    <motion.h2
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      className="text-5xl font-light tracking-tight md:text-8xl font-instrument leading-none italic"
      style={{ color: '#E8E4DC' }}
    >
      {title}
    </motion.h2>
    {subtitle && (
      <motion.p
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        className="max-w-2xl text-xl font-light leading-relaxed"
        style={{ color: 'rgba(220,216,208,0.75)' }}
      >
        {subtitle}
      </motion.p>
    )}
  </div>
);

export const RevealText = ({ children, delay = 0 }) => (
  <motion.span
    initial={{ opacity: 0, y: 10 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.8, delay }}
    viewport={{ once: true }}
    className="inline-block"
  >
    {children}
  </motion.span>
);
