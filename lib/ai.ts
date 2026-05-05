import Anthropic from "@anthropic-ai/sdk";

// Lazily initialize so missing key surfaces at request time, not module load
function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set in environment variables.");
  }
  return new Anthropic({ apiKey });
}

/**
 * SSRF guard — rejects URLs pointing at private/internal/loopback ranges or
 * non-http(s) protocols. Without this, qualifyBusiness() would happily fetch
 * `http://localhost:8080`, `http://10.x.x.x`, or `http://169.254.169.254`
 * (cloud metadata) on behalf of any anonymous form submitter.
 *
 * This is hostname-string-only checking (no DNS resolution) — covers literal
 * IPs and well-known internal names. Good enough for 95% of cases without
 * adding async overhead.
 */
function isUnsafeFetchUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== "http:" && u.protocol !== "https:") return true;
    const host = u.hostname.toLowerCase();
    if (host === "localhost" || host === "0.0.0.0" || host === "::1") return true;
    if (/^127\./.test(host)) return true;
    if (/^10\./.test(host)) return true;
    if (/^192\.168\./.test(host)) return true;
    if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host)) return true;
    if (/^169\.254\./.test(host)) return true; // link-local + cloud metadata
    if (/^fc00:/i.test(host) || /^fd[0-9a-f]{2}:/i.test(host)) return true; // IPv6 ULA
    return false;
  } catch {
    return true;
  }
}

/**
 * Fetches the homepage HTML (first 3000 chars) and asks Haiku to classify
 * the business in one sentence + surface two likely value props.
 */
export async function qualifyBusiness(
  websiteUrl: string
): Promise<{ classification: string; valueProps: string[] }> {
  // Attempt to fetch the homepage with a 5-second timeout
  let homepageSnippet = "(could not fetch homepage)";

  // SSRF guard — refuse to fetch private/loopback/cloud-metadata targets
  if (isUnsafeFetchUrl(websiteUrl)) {
    homepageSnippet = "(URL rejected — unsafe target)";
  } else try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(websiteUrl, { signal: controller.signal });
    clearTimeout(timeout);
    const text = await res.text();
    // Strip most HTML tags to reduce noise
    homepageSnippet = text
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s{2,}/g, " ")
      .trim()
      .slice(0, 3000);
  } catch {
    // Non-fatal — proceed with placeholder
  }

  const client = getClient();
  const message = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 256,
    messages: [
      {
        role: "user",
        content: `You are analyzing a business homepage for a marketing agency. Based on the text below, respond in valid JSON only with two fields:
- "classification": one sentence describing what this business does and who they serve
- "valueProps": an array of exactly 2 strings, each being a likely value proposition for their customers

Homepage text:
"""
${homepageSnippet}
"""

Respond with only the JSON object. No prose, no markdown, no code fences.`,
      },
    ],
  });

  const raw =
    message.content[0].type === "text" ? message.content[0].text : "";

  try {
    const parsed = JSON.parse(raw) as {
      classification: string;
      valueProps: string[];
    };
    return {
      classification: parsed.classification ?? "Business classification unavailable.",
      valueProps: Array.isArray(parsed.valueProps) ? parsed.valueProps : [],
    };
  } catch {
    // If Haiku returns something non-parseable, degrade gracefully
    return {
      classification: raw.trim() || "Business classification unavailable.",
      valueProps: [],
    };
  }
}

/**
 * Given industry + website + classification, asks Haiku for 3 likely
 * competitor names/URLs. No real-time search — Haiku infers from context.
 */
export async function findCompetitors(
  websiteUrl: string,
  industry: string,
  classification: string
): Promise<string[]> {
  const client = getClient();
  const message = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 256,
    messages: [
      {
        role: "user",
        content: `You are helping a marketing agency identify competitors for a prospective client.

Business URL: ${websiteUrl}
Industry: ${industry}
Classification: ${classification}

List 3 likely direct competitors. For each, provide the company name and their likely website URL.
Respond in valid JSON only — an array of strings in this format: "Company Name (website.com)".
No prose, no markdown, no code fences.`,
      },
    ],
  });

  const raw =
    message.content[0].type === "text" ? message.content[0].text : "[]";

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as string[];
  } catch {
    // Degrade: return empty list rather than crash
  }
  return [];
}

/**
 * Uses Sonnet to produce a 3-paragraph "what we'd do for them" briefing
 * written in Liam's voice: direct, specific, no jargon.
 */
export async function generateBriefing(params: {
  businessName: string;
  websiteUrl: string;
  industry: string;
  adSpend: string;
  classification: string;
  valueProps: string[];
  competitors: string[];
  headache: string;
}): Promise<string> {
  const client = getClient();

  const competitorList =
    params.competitors.length > 0
      ? params.competitors.join(", ")
      : "competitors not identified";

  const message = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 600,
    messages: [
      {
        role: "user",
        content: `You are writing a marketing strategy briefing on behalf of Pacific Growth Co, an AI-powered marketing agency. Write in a direct, specific, no-jargon voice. Be confident and concrete — avoid filler phrases like "leveraging synergies" or "robust solutions".

Client info:
- Business: ${params.businessName}
- Website: ${params.websiteUrl}
- Industry: ${params.industry}
- Daily ad budget: ${params.adSpend}
- What they do: ${params.classification}
- Value props: ${params.valueProps.join("; ")}
- Competitors: ${competitorList}
- Their biggest headache: ${params.headache || "not specified"}

Write exactly 3 short paragraphs:
1. What we see when we look at their business (be specific about the opportunity)
2. What we'd do in the first 30 days (concrete tactics, not generalities)
3. What results they could realistically expect in 90 days

No intro sentence, no sign-off, no bullet points. Just the 3 paragraphs separated by a blank line.`,
      },
    ],
  });

  return message.content[0].type === "text"
    ? message.content[0].text.trim()
    : "Briefing unavailable.";
}
