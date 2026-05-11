import fs from "fs/promises";
import path from "path";

// On Vercel (and most serverless platforms) the project root is READ-ONLY —
// only /tmp is writable, and it's ephemeral (wiped on cold start).
// For local dev we keep the data/ folder so leads survive across runs.
//
// MIGRATE BEFORE PROD: swap to Supabase / Vercel Postgres / KV. /tmp leads
// will disappear when the function instance recycles (~minutes of idle).
const IS_SERVERLESS = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME;
const DATA_DIR = IS_SERVERLESS
  ? "/tmp/pacific-growth-co"
  : path.join(process.cwd(), "data");
const LEADS_FILE = path.join(DATA_DIR, "leads.json");
const LOG_FILE = path.join(DATA_DIR, "notifications.log");

export interface Lead {
  id: string;
  submittedAt: string;
  businessName: string;
  websiteUrl: string;
  email: string;
  phone: string;
  adSpend: string;
  industry: string;
  headache: string;
  classification: string;
  competitors: string[];
  briefing: string;
}

/**
 * Atomically appends a lead to data/leads.json.
 * Uses a write-to-tmp-then-rename pattern to avoid partial writes.
 */
export async function saveLead(lead: Lead): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });

  // Read existing leads, defaulting to empty array on first run
  let existing: Lead[] = [];
  try {
    const raw = await fs.readFile(LEADS_FILE, "utf-8");
    existing = JSON.parse(raw) as Lead[];
  } catch {
    // File doesn't exist yet — start fresh
  }

  existing.push(lead);

  // Write to a temp file first, then rename for atomicity
  const tmp = `${LEADS_FILE}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(existing, null, 2), "utf-8");
  await fs.rename(tmp, LEADS_FILE);

  // Append one line to the notification log
  const logLine = `${new Date().toISOString()} | ${lead.businessName} | ${lead.email}\n`;
  await fs.appendFile(LOG_FILE, logLine, "utf-8");
}

/**
 * Read all leads currently in storage. Used by the admin page.
 * Returns most-recent-first.
 *
 * NOTE: On Vercel this only sees leads saved in the same function instance.
 * Cold starts wipe /tmp. Treat this as a "recent activity" view, not an archive.
 */
export async function getLeads(): Promise<Lead[]> {
  try {
    const raw = await fs.readFile(LEADS_FILE, "utf-8");
    const parsed = JSON.parse(raw) as Lead[];
    return [...parsed].reverse();
  } catch {
    return [];
  }
}
