import Reveal from "./Reveal";

export default function CTA({ cta }) {
  return (
    <section id="cta" className="py-48 bg-[#04020e]">
      <div className="mx-auto max-w-shell px-container">
        <Reveal className="mx-auto max-w-3xl text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-red-500 mb-8">Next move</p>
          <h2 className="text-4xl md:text-7xl font-light tracking-tight text-white mb-8">{cta.title}</h2>
          <p className="text-xl text-neutral-400 font-light leading-relaxed mb-16">
            {cta.body}
          </p>
          <div className="flex flex-col gap-6 sm:flex-row sm:justify-center items-center">
            <a 
              className="px-12 py-5 bg-white text-black font-mono text-[10px] uppercase tracking-[0.3em] hover:bg-red-500 hover:text-white transition-all duration-500 rounded-sm" 
              href="mailto:hello@example.com"
            >
              {cta.primary}
            </a>
            <a 
              className="px-12 py-5 border border-white/10 text-white font-mono text-[10px] uppercase tracking-[0.3em] hover:border-white/40 transition-all duration-500 rounded-sm" 
              href="mailto:hello@example.com?subject=Overview"
            >
              {cta.secondary}
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

