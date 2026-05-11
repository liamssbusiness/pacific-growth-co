import { getLeads, type Lead } from "@/lib/leads";

// Don't cache this page — leads update constantly
export const dynamic = "force-dynamic";
export const revalidate = 0;

interface PageProps {
  searchParams: { token?: string };
}

/**
 * Admin view of recent leads. Gated by env var ADMIN_TOKEN.
 *
 * Security model:
 *   - If ADMIN_TOKEN is not set in the environment, this page returns a
 *     "not configured" message and never reveals lead data. Safe-by-default.
 *   - If ADMIN_TOKEN is set, the `?token=` query param must match exactly.
 *   - Mismatch returns "unauthorized" with no leak about the correct token.
 *
 * NOTE: Reads from /tmp on Vercel (ephemeral). Cold starts wipe data. Treat
 * this as "recent activity" not "archive". Vercel runtime logs (filter for
 * "NEW_LEAD") have the full audit trail.
 */
export default async function AdminLeadsPage({ searchParams }: PageProps) {
  const expected = process.env.ADMIN_TOKEN;

  if (!expected) {
    return (
      <Shell>
        <h1 className="text-2xl font-semibold">Admin not configured</h1>
        <p className="mt-4 text-stone-400">
          Set the <code className="rounded bg-stone-800 px-1.5 py-0.5 text-teal-400">ADMIN_TOKEN</code> environment
          variable in Vercel, then visit{" "}
          <code className="rounded bg-stone-800 px-1.5 py-0.5 text-teal-400">/admin/leads?token=YOUR_TOKEN</code>.
        </p>
        <p className="mt-2 text-sm text-stone-500">
          Pick any long random string — it&apos;s only checked against the query param.
        </p>
      </Shell>
    );
  }

  if (searchParams.token !== expected) {
    return (
      <Shell>
        <h1 className="text-2xl font-semibold">Unauthorized</h1>
        <p className="mt-4 text-stone-400">
          Append the correct <code className="rounded bg-stone-800 px-1.5 py-0.5">?token=...</code> to the URL.
        </p>
      </Shell>
    );
  }

  const leads = await getLeads();

  return (
    <Shell>
      <div className="mb-6 flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">Recent leads</h1>
        <p className="text-sm text-stone-500">
          {leads.length} {leads.length === 1 ? "lead" : "leads"} in this
          function instance
        </p>
      </div>

      {leads.length === 0 ? (
        <div className="rounded-lg border border-stone-800 bg-stone-900/50 p-8 text-center text-stone-400">
          No leads yet. Either nothing submitted, or the serverless instance
          was recycled and wiped <code className="text-teal-400">/tmp</code>.
          <br />
          <span className="mt-2 inline-block text-sm text-stone-500">
            Check Vercel runtime logs and filter for <code className="text-teal-400">NEW_LEAD</code> for the full audit trail.
          </span>
        </div>
      ) : (
        <div className="space-y-4">
          {leads.map((lead) => (
            <LeadCard key={lead.id} lead={lead} />
          ))}
        </div>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-stone-950 px-6 py-12 text-stone-100">
      <div className="mx-auto max-w-4xl">{children}</div>
    </main>
  );
}

function LeadCard({ lead }: { lead: Lead }) {
  return (
    <article className="rounded-lg border border-stone-800 bg-stone-900/50 p-5">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-medium">{lead.businessName}</h2>
        <time className="text-xs text-stone-500">
          {new Date(lead.submittedAt).toLocaleString()}
        </time>
      </header>

      <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
        <Field label="Website" value={lead.websiteUrl} link />
        <Field label="Email" value={lead.email} link={`mailto:${lead.email}`} />
        <Field label="Phone" value={lead.phone} link={`tel:${lead.phone}`} />
        <Field label="Industry" value={lead.industry} />
        <Field label="Daily ad budget" value={lead.adSpend} />
        <Field label="Lead ID" value={lead.id.slice(0, 8)} />
      </dl>

      {lead.headache && (
        <details className="mt-4">
          <summary className="cursor-pointer text-sm text-stone-400 hover:text-stone-200">
            Their headache
          </summary>
          <p className="mt-2 text-sm text-stone-300">{lead.headache}</p>
        </details>
      )}

      <details className="mt-3">
        <summary className="cursor-pointer text-sm text-stone-400 hover:text-stone-200">
          AI classification &amp; competitors
        </summary>
        <div className="mt-2 space-y-2 text-sm text-stone-300">
          <p>
            <span className="text-stone-500">Classification:</span>{" "}
            {lead.classification}
          </p>
          <p>
            <span className="text-stone-500">Competitors:</span>{" "}
            {lead.competitors.length > 0
              ? lead.competitors.join(", ")
              : "(none identified)"}
          </p>
        </div>
      </details>

      <details className="mt-3">
        <summary className="cursor-pointer text-sm text-teal-400 hover:text-teal-300">
          Briefing we sent them
        </summary>
        <pre className="mt-2 whitespace-pre-wrap rounded bg-stone-950 p-3 text-sm text-stone-200">
          {lead.briefing}
        </pre>
      </details>
    </article>
  );
}

function Field({
  label,
  value,
  link,
}: {
  label: string;
  value: string;
  link?: string | true;
}) {
  const href =
    link === true ? (value.startsWith("http") ? value : `https://${value}`) : link;
  return (
    <div className="flex gap-2">
      <dt className="w-32 shrink-0 text-stone-500">{label}</dt>
      <dd className="truncate text-stone-200">
        {href ? (
          <a
            href={href}
            className="text-teal-400 hover:text-teal-300"
            target={typeof link === "string" && link.startsWith("mailto:") ? undefined : "_blank"}
            rel="noopener noreferrer"
          >
            {value}
          </a>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}
