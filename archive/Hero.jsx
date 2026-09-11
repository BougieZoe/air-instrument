export default function Hero({ hero }) {
  return (
    <section className="section-hero relative">
      <div className="mx-auto max-w-shell px-container">
        {/* Technical Header Info */}
        <div className="flex justify-between items-center mb-16 opacity-50 font-mono text-[var(--type-meta)] uppercase tracking-widest">
          <div className="flex items-center gap-4">
            <span>ZOE_OS // V1.0.0</span>
            <span className="hidden md:inline">SYSTEM_STATUS: NOMINAL</span>
          </div>
          <div className="hidden md:block">
            {new Date().toLocaleDateString()}
          </div>
        </div>

        <div className="hero-stack mx-auto flex max-w-copy flex-col items-center text-center">
          <p className="meta" style={{ "--stagger-index": 0 }}>
            {hero.eyebrow}
          </p>
          <h1
            style={{ "--stagger-index": 1 }}
          >
            {hero.title.split("\n").map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </h1>
          <p
            className="lead"
            style={{ "--stagger-index": 2 }}
          >
            {hero.subtitle}
          </p>
          <div className="flex flex-col gap-4 sm:flex-row mt-4" style={{ "--stagger-index": 3 }}>
            <a className="btn-primary" href="#cta">
              {hero.primaryCta}
            </a>
            <a className="btn-secondary" href="#features">
              {hero.secondaryCta}
            </a>
          </div>
          <div
            className="mt-12 flex flex-wrap items-center justify-center gap-4"
            style={{ "--stagger-index": 4 }}
          >
            {hero.socialProof.map((item) => (
              <span key={item} className="proof-chip">
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

