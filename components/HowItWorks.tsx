const steps = [
  {
    number: "01",
    title: "Submit your business",
    desc: "Tell us your website, industry, and ad spend. Takes under 2 minutes.",
  },
  {
    number: "02",
    title: "AI analyzes your site + 3 competitors in 60 seconds",
    desc: "Our system reads your homepage, identifies your offer, and pulls your top competitors automatically.",
  },
  {
    number: "03",
    title: "Get a free teardown + custom plan in your inbox",
    desc: "You'll see a summary right here on the page, and a full written plan lands in your email — no pitch call required to get it.",
  },
];

export default function HowItWorks() {
  return (
    <section className="bg-stone-100 py-24 sm:py-32">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mb-16">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-teal-600">
            How it works
          </p>
          <h2 className="text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">
            From &ldquo;who are you&rdquo; to custom plan — in 60 seconds.
          </h2>
        </div>

        <div className="relative space-y-0">
          {/* Connecting line */}
          <div className="absolute left-6 top-8 hidden h-[calc(100%-4rem)] w-px bg-stone-300 sm:block" />

          {steps.map(({ number, title, desc }, i) => (
            <div
              key={number}
              className="relative flex gap-8 pb-12 last:pb-0"
            >
              {/* Step number bubble */}
              <div className="relative z-10 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full border-2 border-teal-500 bg-stone-100 text-sm font-bold tabular-nums text-teal-600">
                {number}
              </div>
              <div className="pt-2.5">
                <h3 className="mb-1.5 text-base font-semibold text-stone-900">
                  {title}
                </h3>
                <p className="text-sm leading-relaxed text-stone-500">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
