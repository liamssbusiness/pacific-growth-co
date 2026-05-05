import { NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "crypto";
import { qualifyBusiness, findCompetitors, generateBriefing } from "@/lib/ai";
import { saveLead, type Lead } from "@/lib/leads";

const LeadSchema = z.object({
  businessName: z.string().min(1, "Business name is required."),
  websiteUrl: z.string().url("Invalid website URL."),
  email: z.string().email("Invalid email address."),
  phone: z.string().min(7, "Phone number is required."),
  adSpend: z.string().min(1, "Ad spend range is required."),
  industry: z.enum(["e-commerce", "local-services", "b2b", "other"], {
    errorMap: () => ({ message: "Select a valid industry." }),
  }),
  headache: z.string().optional().default(""),
});

export async function POST(request: Request) {
  // Parse body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  // Validate
  const parsed = LeadSchema.safeParse(body);
  if (!parsed.success) {
    const firstError = parsed.error.errors[0]?.message ?? "Validation error.";
    return NextResponse.json({ error: firstError }, { status: 422 });
  }

  const { businessName, websiteUrl, email, phone, adSpend, industry, headache } =
    parsed.data;

  // Fail fast if API key is missing before doing any I/O
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      {
        error:
          "ANTHROPIC_API_KEY is not configured. Add it to your .env.local file.",
      },
      { status: 503 }
    );
  }

  try {
    // Step 1: Qualify the business
    const { classification, valueProps } = await qualifyBusiness(websiteUrl);

    // Step 2: Find competitors
    const competitors = await findCompetitors(websiteUrl, industry, classification);

    // Step 3: Generate the briefing
    const briefing = await generateBriefing({
      businessName,
      websiteUrl,
      industry,
      adSpend,
      classification,
      valueProps,
      competitors,
      headache,
    });

    // Persist the lead
    const lead: Lead = {
      id: randomUUID(),
      submittedAt: new Date().toISOString(),
      businessName,
      websiteUrl,
      email,
      phone,
      adSpend,
      industry,
      headache,
      classification,
      competitors,
      briefing,
    };

    await saveLead(lead);

    return NextResponse.json(
      { briefing, competitors, classification },
      { status: 200 }
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unexpected server error.";
    console.error("[/api/leads]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
