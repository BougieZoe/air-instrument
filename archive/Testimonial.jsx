import Reveal from "./Reveal";

export default function Testimonial({ testimonial }) {
  return (
    <section className="py-48 bg-[#04020e]">
      <div className="mx-auto max-w-shell px-container">
        <Reveal as="figure" className="mx-auto flex max-w-4xl flex-col items-center text-center">
          <div className="relative mb-12">
            <div className="absolute inset-0 bg-red-500 rounded-full blur-2xl opacity-10 animate-pulse" />
            <img
              src={testimonial.avatar}
              alt={testimonial.name}
              width="120"
              height="120"
              loading="lazy"
              decoding="async"
              className="relative z-10 h-28 w-28 rounded-full border border-white/10 object-cover grayscale brightness-110"
            />
          </div>
          <blockquote className="font-instrument text-5xl leading-[0.9] text-white md:text-8xl italic">
            “{testimonial.quote}”
          </blockquote>
          <figcaption className="mt-12 flex items-center gap-6">
            <div className="w-12 h-[1px] bg-red-500/30" />
            <span className="font-mono text-[10px] uppercase tracking-[0.4em] text-neutral-500">
              {testimonial.name} // {testimonial.role}
            </span>
          </figcaption>
        </Reveal>
      </div>
    </section>
  );
}
