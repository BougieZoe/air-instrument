import Reveal from "./Reveal";

export default function FeatureGrid({ features }) {
  return (
    <section id="features" className="py-32 bg-[#04020e]">
      <div className="mx-auto max-w-shell px-container">
        <Reveal as="header" className="mx-auto max-w-copy text-center mb-24">
          <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-red-500 mb-6">Capabilities</p>
          <h2 className="text-5xl md:text-8xl font-light tracking-tight text-white leading-tight font-instrument italic">
            Precision systems. Clear surfaces. Durable product presence.
          </h2>
        </Reveal>
        <div className="grid gap-8 md:grid-cols-3">
          {features.map((feature, index) => (
            <Reveal
              key={feature.title}
              as="article"
              className="group p-10 border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-all duration-500 rounded-sm"
              delay={index * 100}
            >
              <h3 className="text-xl font-medium text-white mb-6 group-hover:text-red-500 transition-colors">
                {feature.title}
              </h3>
              <p className="text-neutral-400 leading-relaxed font-light">
                {feature.body}
              </p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

