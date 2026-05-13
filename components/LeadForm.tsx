"use client";

import { useState, type FormEvent, type ChangeEvent } from "react";
import { CheckCircle2 } from "lucide-react";
import AgentSwarm, {
  INITIAL_SWARM,
  type SwarmState,
  type AgentPhase,
} from "@/components/AgentSwarm";

interface FormData {
  businessName: string;
  websiteUrl: string;
  email: string;
  phone: string;
  adSpend: string;
  industry: string;
  headache: string;
}

interface FinalResult {
  briefing: string;
  competitors: string[];
  classification: string;
}

type SubmitState = "idle" | "loading" | "success" | "error";

/** Each SSE event payload from /api/leads. */
interface StreamEvent {
  phase: AgentPhase | "start" | "done" | "error";
  status?: "running" | "complete";
  classification?: string;
  valueProps?: string[];
  competitors?: string[];
  briefing?: string;
  message?: string;
  id?: string;
}

const initialForm: FormData = {
  businessName: "",
  websiteUrl: "",
  email: "",
  phone: "",
  adSpend: "",
  industry: "",
  headache: "",
};

const inputClass =
  "w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-900 placeholder:text-stone-400 transition-colors focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100";

const labelClass = "mb-1.5 block text-sm font-medium text-stone-700";

export default function LeadForm() {
  const [form, setForm] = useState<FormData>(initialForm);
  const [state, setState] = useState<SubmitState>("idle");
  const [result, setResult] = useState<FinalResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof FormData, string>>
  >({});
  const [swarm, setSwarm] = useState<SwarmState>(INITIAL_SWARM);

  function handleChange(
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name as keyof FormData]) {
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  }

  function validate(): boolean {
    const errors: Partial<Record<keyof FormData, string>> = {};
    if (!form.businessName.trim())
      errors.businessName = "Business name is required.";
    if (!form.websiteUrl.trim()) {
      errors.websiteUrl = "Website URL is required.";
    } else {
      try {
        new URL(
          form.websiteUrl.startsWith("http")
            ? form.websiteUrl
            : `https://${form.websiteUrl}`
        );
      } catch {
        errors.websiteUrl = "Enter a valid URL (e.g. https://example.com).";
      }
    }
    if (!form.email.trim()) {
      errors.email = "Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errors.email = "Enter a valid email address.";
    }
    if (!form.phone.trim()) errors.phone = "Phone number is required.";
    if (!form.adSpend) errors.adSpend = "Select your daily ad budget.";
    if (!form.industry) errors.industry = "Select your industry.";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  /** Apply one SSE event to the swarm visual state + accumulate final result. */
  function applyEvent(evt: StreamEvent, accum: Partial<FinalResult>): void {
    if (evt.phase === "error") {
      throw new Error(evt.message ?? "Server stream error.");
    }

    if (evt.phase === "qualifier") {
      setSwarm((prev) => ({
        ...prev,
        qualifier: {
          status: evt.status === "complete" ? "complete" : "running",
          result: evt.classification,
        },
      }));
      if (evt.status === "complete" && evt.classification) {
        accum.classification = evt.classification;
      }
    } else if (evt.phase === "competitors") {
      setSwarm((prev) => ({
        ...prev,
        competitors: {
          status: evt.status === "complete" ? "complete" : "running",
          result:
            evt.status === "complete" && evt.competitors
              ? evt.competitors.slice(0, 3).join(" · ")
              : undefined,
        },
      }));
      if (evt.status === "complete" && evt.competitors) {
        accum.competitors = evt.competitors;
      }
    } else if (evt.phase === "briefing") {
      setSwarm((prev) => ({
        ...prev,
        briefing: {
          status: evt.status === "complete" ? "complete" : "running",
          result:
            evt.status === "complete" && evt.briefing
              ? `${evt.briefing.slice(0, 120)}…`
              : undefined,
        },
      }));
      if (evt.status === "complete" && evt.briefing) {
        accum.briefing = evt.briefing;
      }
    }
    // "start" and "done" phases — no UI updates needed beyond completion.
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setState("loading");
    setErrorMsg("");
    setSwarm(INITIAL_SWARM);

    const accum: Partial<FinalResult> = {};

    try {
      const url = form.websiteUrl.startsWith("http")
        ? form.websiteUrl
        : `https://${form.websiteUrl}`;

      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, websiteUrl: url }),
      });

      // Validation/auth errors return JSON (not SSE) — handle them.
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Request failed (${res.status}).`);
      }

      if (!res.body) {
        throw new Error("Streaming not supported by your browser.");
      }

      // Read SSE chunks: split by "\n\n", parse `data: ...` lines as JSON.
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // Each complete SSE event ends with a blank line ("\n\n")
        let sepIdx;
        while ((sepIdx = buffer.indexOf("\n\n")) !== -1) {
          const chunk = buffer.slice(0, sepIdx);
          buffer = buffer.slice(sepIdx + 2);

          for (const line of chunk.split("\n")) {
            if (!line.startsWith("data:")) continue;
            const payload = line.slice(5).trim();
            if (!payload) continue;
            try {
              const evt = JSON.parse(payload) as StreamEvent;
              applyEvent(evt, accum);
            } catch {
              // Skip malformed events rather than abort the stream
            }
          }
        }
      }

      if (!accum.briefing) {
        throw new Error("Stream ended before briefing was generated.");
      }

      setResult({
        briefing: accum.briefing,
        competitors: accum.competitors ?? [],
        classification: accum.classification ?? "",
      });
      setState("success");
    } catch (err) {
      setState("error");
      setErrorMsg(err instanceof Error ? err.message : "Unexpected error.");
    }
  }

  return (
    <section id="get-teardown" className="bg-stone-50 py-24 sm:py-32">
      <div className="mx-auto max-w-2xl px-6">
        <div className="mb-12">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-teal-600">
            Free competitor teardown
          </p>
          <h2 className="text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">
            See exactly where you stand — and what to do about it.
          </h2>
          <p className="mt-4 text-stone-500">
            Fill this out and watch three AI agents work on your business in
            real time. Briefing arrives below in ~15 seconds.
          </p>
        </div>

        {state === "loading" && <AgentSwarm swarm={swarm} />}

        {state === "success" && result ? (
          <div className="space-y-6">
            {/* Final swarm snapshot — all three agents done */}
            <AgentSwarm swarm={swarm} />

            <div className="rounded-2xl border border-teal-200 bg-white p-8">
              <div className="mb-6 flex items-center gap-3">
                <CheckCircle2 className="text-teal-500" size={22} />
                <h3 className="text-base font-semibold text-stone-900">
                  Your AI briefing
                </h3>
              </div>

              {result.classification && (
                <div className="mb-6 rounded-xl bg-stone-50 p-5">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-stone-400">
                    Business classification
                  </p>
                  <p className="text-sm text-stone-700">
                    {result.classification}
                  </p>
                </div>
              )}

              {result.competitors.length > 0 && (
                <div className="mb-6 rounded-xl bg-stone-50 p-5">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-stone-400">
                    Competitors identified
                  </p>
                  <ul className="space-y-1">
                    {result.competitors.map((c, i) => (
                      <li key={i} className="text-sm text-stone-700">
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="rounded-xl bg-teal-50 p-5">
                <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-teal-700">
                  What we&apos;d do for your business
                </p>
                <div className="space-y-3">
                  {result.briefing
                    .split("\n\n")
                    .filter(Boolean)
                    .map((para, i) => (
                      <p
                        key={i}
                        className="text-sm leading-relaxed text-stone-700"
                      >
                        {para}
                      </p>
                    ))}
                </div>
              </div>

              <p className="mt-6 text-xs text-stone-400">
                The full teardown with specific ad recommendations is on its
                way to your inbox.
              </p>
            </div>
          </div>
        ) : state !== "loading" ? (
          <form
            onSubmit={handleSubmit}
            noValidate
            className="rounded-2xl border border-stone-200 bg-white p-8 shadow-sm"
          >
            <div className="grid gap-5 sm:grid-cols-2">
              {/* Business name */}
              <div>
                <label htmlFor="businessName" className={labelClass}>
                  Business name <span className="text-teal-500">*</span>
                </label>
                <input
                  id="businessName"
                  name="businessName"
                  type="text"
                  autoComplete="organization"
                  placeholder="Acme Coffee Co."
                  value={form.businessName}
                  onChange={handleChange}
                  className={inputClass}
                  aria-invalid={!!fieldErrors.businessName}
                  aria-describedby={
                    fieldErrors.businessName ? "businessName-err" : undefined
                  }
                />
                {fieldErrors.businessName && (
                  <p
                    id="businessName-err"
                    className="mt-1 text-xs text-red-500"
                  >
                    {fieldErrors.businessName}
                  </p>
                )}
              </div>

              {/* Website */}
              <div>
                <label htmlFor="websiteUrl" className={labelClass}>
                  Website URL <span className="text-teal-500">*</span>
                </label>
                <input
                  id="websiteUrl"
                  name="websiteUrl"
                  type="url"
                  autoComplete="url"
                  placeholder="https://yoursite.com"
                  value={form.websiteUrl}
                  onChange={handleChange}
                  className={inputClass}
                  aria-invalid={!!fieldErrors.websiteUrl}
                  aria-describedby={
                    fieldErrors.websiteUrl ? "websiteUrl-err" : undefined
                  }
                />
                {fieldErrors.websiteUrl && (
                  <p id="websiteUrl-err" className="mt-1 text-xs text-red-500">
                    {fieldErrors.websiteUrl}
                  </p>
                )}
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className={labelClass}>
                  Email <span className="text-teal-500">*</span>
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@company.com"
                  value={form.email}
                  onChange={handleChange}
                  className={inputClass}
                  aria-invalid={!!fieldErrors.email}
                  aria-describedby={
                    fieldErrors.email ? "email-err" : undefined
                  }
                />
                {fieldErrors.email && (
                  <p id="email-err" className="mt-1 text-xs text-red-500">
                    {fieldErrors.email}
                  </p>
                )}
              </div>

              {/* Phone */}
              <div>
                <label htmlFor="phone" className={labelClass}>
                  Phone <span className="text-teal-500">*</span>
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="(555) 000-0000"
                  value={form.phone}
                  onChange={handleChange}
                  className={inputClass}
                  aria-invalid={!!fieldErrors.phone}
                  aria-describedby={
                    fieldErrors.phone ? "phone-err" : undefined
                  }
                />
                {fieldErrors.phone && (
                  <p id="phone-err" className="mt-1 text-xs text-red-500">
                    {fieldErrors.phone}
                  </p>
                )}
              </div>

              {/* Ad spend */}
              <div>
                <label htmlFor="adSpend" className={labelClass}>
                  Daily ad budget <span className="text-teal-500">*</span>
                </label>
                <select
                  id="adSpend"
                  name="adSpend"
                  value={form.adSpend}
                  onChange={handleChange}
                  className={inputClass}
                  aria-invalid={!!fieldErrors.adSpend}
                  aria-describedby={
                    fieldErrors.adSpend ? "adSpend-err" : undefined
                  }
                >
                  <option value="">Select range</option>
                  <option value="$0/day">$0 — just starting</option>
                  <option value="$30-100/day">$30 – $100 / day</option>
                  <option value="$100-300/day">$100 – $300 / day</option>
                  <option value="$300-1K/day">$300 – $1K / day</option>
                  <option value="$1K+/day">$1K+ / day</option>
                </select>
                {fieldErrors.adSpend && (
                  <p id="adSpend-err" className="mt-1 text-xs text-red-500">
                    {fieldErrors.adSpend}
                  </p>
                )}
              </div>

              {/* Industry */}
              <div>
                <label htmlFor="industry" className={labelClass}>
                  Industry <span className="text-teal-500">*</span>
                </label>
                <select
                  id="industry"
                  name="industry"
                  value={form.industry}
                  onChange={handleChange}
                  className={inputClass}
                  aria-invalid={!!fieldErrors.industry}
                  aria-describedby={
                    fieldErrors.industry ? "industry-err" : undefined
                  }
                >
                  <option value="">Select industry</option>
                  <option value="e-commerce">E-commerce</option>
                  <option value="local-services">Local services</option>
                  <option value="b2b">B2B</option>
                  <option value="other">Other</option>
                </select>
                {fieldErrors.industry && (
                  <p id="industry-err" className="mt-1 text-xs text-red-500">
                    {fieldErrors.industry}
                  </p>
                )}
              </div>
            </div>

            {/* Headache */}
            <div className="mt-5">
              <label htmlFor="headache" className={labelClass}>
                Biggest marketing headache{" "}
                <span className="font-normal text-stone-400">(optional)</span>
              </label>
              <textarea
                id="headache"
                name="headache"
                rows={3}
                placeholder="e.g. CPAs keep rising, hard to know what creative is actually working..."
                value={form.headache}
                onChange={handleChange}
                className={`${inputClass} resize-none`}
              />
            </div>

            {state === "error" && (
              <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
                {errorMsg}
              </p>
            )}

            <button
              type="submit"
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-teal-600 px-8 py-4 text-sm font-semibold text-white transition-all duration-200 hover:bg-teal-500 disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:ring-offset-2"
            >
              Get my free teardown
            </button>

            <p className="mt-3 text-center text-xs text-stone-400">
              No pitch call required. No spam. Just the teardown.
            </p>
          </form>
        ) : null}
      </div>
    </section>
  );
}
