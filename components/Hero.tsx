export default function Hero() {
  return (
    <section className="relative min-h-screen flex flex-col justify-center overflow-hidden bg-stone-950">
      {/* Subtle radial gradient accent — deep teal glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(13,148,136,0.18) 0%, transparent 70%)",
        }}
      />

      {/* Fine grid texture overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative z-10 mx-auto w-full max-w-5xl px-6 py-24 sm:py-32">
        {/* Wordmark */}
        <div className="mb-14 flex items-center gap-2.5">
          <span className="h-2 w-2 rounded-full bg-teal-500" />
          <span className="text-sm font-medium tracking-widest text-stone-400 uppercase">
            Pacific Growth Co
          </span>
        </div>

        {/* Headline */}
        <h1 className="max-w-3xl text-balance text-5xl font-semibold leading-[1.1] tracking-tighter text-white sm:text-6xl lg:text-7xl">
          Your AI marketing team.{" "}
          <span className="text-teal-400">
            Daily ad creative, real competitor research.
          </span>
        </h1>

        <p className="mt-8 max-w-xl text-lg leading-relaxed text-stone-400">
          Monthly retainer, no contracts, cancel anytime. We only work with
          businesses we know we can move the needle for.
        </p>

        <div className="mt-12 flex flex-col gap-4 sm:flex-row sm:items-center">
          <a
            href="#get-teardown"
            className="inline-flex items-center justify-center rounded-full bg-teal-500 px-8 py-4 text-sm font-semibold text-white transition-all duration-200 hover:bg-teal-400 hover:shadow-[0_0_24px_rgba(20,184,166,0.4)] focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-offset-2 focus:ring-offset-stone-950"
          >
            Get a free competitor teardown
          </a>
          <span className="text-sm text-stone-500">
            60-second AI analysis, no credit card.
          </span>
        </div>

        {/* Social proof nudge */}
        <div className="mt-16 flex items-center gap-3">
          <div className="flex -space-x-2">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-8 w-8 rounded-full border-2 border-stone-950 bg-stone-700"
              />
            ))}
          </div>
          <p className="text-sm text-stone-500">
            Selective client list — 14 active brands
          </p>
        </div>
      </div>
    </section>
  );
}
