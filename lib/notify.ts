import type { Lead } from "@/lib/leads";

// Teal — matches the Pacific Growth Co site accent.
const EMBED_COLOR = 0x14b8a6;
const WEBHOOK_TIMEOUT_MS = 5000;

/** Trim a string to `max` chars, appending an ellipsis when truncated. */
function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1).trimEnd()}…`;
}

/** A Discord embed field rejects an empty value — fall back to an em dash. */
function field(name: string, value: string, inline = false) {
  return { name, value: truncate(value.trim() || "—", 1024), inline };
}

/**
 * Posts a lead alert to a Discord channel via an incoming webhook.
 *
 * No-op when DISCORD_WEBHOOK_URL is unset, so the feature stays dark until
 * configured. Never throws — a failed or slow notification must not break
 * lead capture; failures are logged and swallowed.
 */
export async function notifyNewLead(lead: Lead): Promise<void> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) return;

  const competitors =
    lead.competitors.length > 0 ? lead.competitors.join("\n") : "—";

  const payload = {
    username: "Pacific Growth Co",
    content: `New lead — **${truncate(lead.businessName, 200)}**`,
    embeds: [
      {
        title: truncate(`New lead: ${lead.businessName}`, 256),
        url: lead.websiteUrl,
        color: EMBED_COLOR,
        description: truncate(lead.briefing || "—", 600),
        fields: [
          field("Daily ad budget", lead.adSpend, true),
          field("Industry", lead.industry, true),
          field("Email", lead.email, true),
          field("Phone", lead.phone, true),
          field("Website", lead.websiteUrl),
          field("Biggest headache", lead.headache),
          field("AI classification", lead.classification),
          field("Competitors", competitors),
        ],
        footer: { text: `Lead ID ${lead.id}` },
        timestamp: lead.submittedAt,
      },
    ],
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    if (!res.ok) {
      console.error(
        `[notify] Discord webhook returned ${res.status} ${res.statusText}`
      );
    }
  } catch (err) {
    console.error(
      "[notify] Discord webhook failed:",
      err instanceof Error ? err.message : err
    );
  } finally {
    clearTimeout(timeout);
  }
}
