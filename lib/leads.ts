import fs from "fs/promises";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
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
