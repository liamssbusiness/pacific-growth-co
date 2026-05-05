import { Sparkles, BarChart2, Search } from "lucide-react";

const pillars = [
  {
    Icon: Sparkles,
    title: "Daily ad creative",
    desc: "Fresh ad concepts, copy, and variations generated every day — tuned to your offer and audience, not recycled templates.",
  },
  {
    Icon: Search,
    title: "Real-time competitor intel",
    desc: "We track what your top 3 competitors are running so you stay one step ahead instead of guessing what's working.",
  },
  {
    Icon: BarChart2,
    title: "Performance dashboard",
    desc: "One clean view of your spend, creative performance, and recommendations. No login archaeology required.",
  },
];

export default function WhatYouGet() {
  return (
    <section className="bg-stone-50 py-24 sm:py-32">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mb-16">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-teal-600">
            What you get
          </p>
          <h2 className="text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">
            A full marketing team. Without the overhead.
          </h2>
        </div>

        <div className="grid gap-8 sm:grid-cols-3">
          {pillars.map(({ Icon, title, desc }) => (
            <div
              key={title}
              className="group rounded-2xl border border-stone-200 bg-white p-8 transition-all duration-200 hover:border-teal-200 hover:shadow-lg hover:shadow-teal-50"
            >
              <div className="mb-5 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-600 transition-colors group-hover:bg-teal-100">
                <Icon size={20} strokeWidth={1.75} />
              </div>
              <h3 className="mb-2 text-base font-semibold text-stone-900">
                {title}
              </h3>
              <p className="text-sm leading-relaxed text-stone-500">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
