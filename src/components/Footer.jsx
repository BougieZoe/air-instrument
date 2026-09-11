export default function Footer() {
  return (
    <footer className="border-t border-white/5 bg-[#04020e] py-16">
      <div className="mx-auto flex max-w-shell flex-col gap-8 px-container text-sm text-neutral-500 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/60">Zoe OS // v2.0</p>
          <p className="text-xs opacity-40">Built for the cross-cultural mind.</p>
        </div>
        <nav className="flex gap-8 font-mono text-[10px] uppercase tracking-widest">
          <a href="#features" className="hover:text-red-500 transition-colors">Work</a>
          <a href="https://github.com/BougieZoe" rel="noreferrer" target="_blank" className="hover:text-red-500 transition-colors">
            GitHub
          </a>
          <a href="https://www.linkedin.com" rel="noreferrer" target="_blank" className="hover:text-red-500 transition-colors">
            LinkedIn
          </a>
        </nav>
      </div>
    </footer>
  );
}
