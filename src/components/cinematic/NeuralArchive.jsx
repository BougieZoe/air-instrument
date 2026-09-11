import { motion } from "framer-motion";
import { Cpu, Sparkles, Shield, Hash, ArrowUpRight, Globe, Layers, Zap } from "lucide-react";

const ArchiveItem = ({ title, icon: Icon, description, category, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] }}
    viewport={{ once: true }}
    className="group relative bg-white/[0.02] border border-white/[0.05] p-10 space-y-8 hover:bg-white/[0.04] transition-all duration-500 rounded-2xl overflow-hidden"
  >
    <div className="absolute top-0 left-0 w-1 h-full bg-red-500 scale-y-0 group-hover:scale-y-100 transition-transform duration-500 origin-top" />
    
    <div className="flex justify-between items-start">
      <div className="p-4 bg-white/[0.05] rounded-xl text-white group-hover:bg-red-500 group-hover:text-white transition-colors duration-500">
        <Icon size={24} strokeWidth={1.5} />
      </div>
      <span className="font-mono text-[10px] uppercase tracking-widest text-neutral-500 group-hover:text-red-500 transition-colors">
        {category}
      </span>
    </div>

    <div className="space-y-4">
      <h3 className="text-2xl font-medium tracking-tight text-white group-hover:translate-x-1 transition-transform duration-500">
        {title}
      </h3>
      <p className="text-neutral-400 font-light leading-relaxed group-hover:text-neutral-300 transition-colors">
        {description}
      </p>
    </div>

    <div className="pt-4 flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.2em] text-neutral-500 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-2 group-hover:translate-y-0">
      <span>Access_Node</span>
      <ArrowUpRight size={12} />
    </div>
  </motion.div>
);

export default function NeuralArchive({ zoeMode }) {
  const archiveData = [
    { title: "Synaptic Mapping", icon: Cpu, category: "Core_Intelligence", description: "Real-time visual tracing of machine logic as it aligns with your specific intent profile." },
    { title: "Context Gifting", icon: Sparkles, category: "Neural_Memory", description: "The system identifies dormant insights from past sessions and offers them during high-stakes synthesis." },
    { title: "Sovereign Vault", icon: Shield, category: "Security_Layer", description: "End-to-end neural encryption. Your digital shadow is stored locally, indexed for only your eyes." },
    { title: "Aesthetic Index", icon: Hash, category: "Identity_Core", description: "A living record of your visual preferences, automatically applying your soul's restraint to every output." },
    { title: "Global Synthesis", icon: Globe, category: "External_Signals", description: "Cross-domain research distillation that filters global noise into your personal signal." },
    { title: "Layered Hierarchy", icon: Layers, category: "Architecture", description: "Structural transparency in decision making. See exactly how every spark became a system." }
  ];

  return (
    <section className={`py-48 px-8 transition-colors duration-1000 ${zoeMode ? 'bg-zinc-950' : 'bg-[#04020e]'}`}>
      <div className="max-w-7xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-end gap-12 mb-32">
          <div className="max-w-2xl space-y-6">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              className="flex items-center gap-4"
            >
              <div className="w-10 h-[1px] bg-red-500" />
              <span className="font-mono text-xs text-red-500 uppercase tracking-widest">02 // NEURAL_ARCHIVE</span>
            </motion.div>
            <h2 className={`text-4xl md:text-7xl font-medium tracking-tighter leading-none ${zoeMode ? 'text-white' : 'text-white font-display'}`}>
              Permanence in an age <br /> of the ephemeral.
            </h2>
          </div>
          <p className="max-w-xs text-neutral-500 font-light text-lg leading-relaxed text-right md:mb-4">
            The OS learns the cadence of your thought, building a durable digital shadow.
          </p>
        </header>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {archiveData.map((item, i) => (
            <ArchiveItem 
              key={i} 
              {...item} 
              delay={i * 0.1} 
              zoeMode={zoeMode}
            />
          ))}
        </div>

        <motion.div 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          className="mt-32 pt-16 border-t border-white/[0.05] flex justify-between items-center"
        >
          <div className="flex gap-12 font-mono text-[9px] uppercase tracking-[0.4em] text-neutral-500">
            <div className="flex items-center gap-2">
              <Zap size={12} className="text-red-500" />
              <span>Real_Time_Sync: Active</span>
            </div>
            <span>Archive_Nodes: 4,092</span>
          </div>
          <button className="font-mono text-[9px] uppercase tracking-[0.4em] text-neutral-400 hover:text-red-500 transition-colors">
            View_Full_Directory →
          </button>
        </motion.div>
      </div>
    </section>
  );
}

