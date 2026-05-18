import { z } from "zod";
import { randomUUID } from "crypto";
import { qualifyBusiness, findCompetitors, generateBriefing } from "@/lib/ai";
import { saveLead, type Lead } from "@/lib/leads";
import { notifyNewLead } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

/**
 * Encode a payload as a Server-Sent Event line.
 *   data: {"phase":"qualifier","status":"complete",...}\n\n
 */
function sseEvent(data: unknown): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

/**
 * POST /api/leads
 *
 * Streams agent-swarm progress as Server-Sent Events (text/event-stream).
 * The client opens a single POST + reads chunks, rendering each "phase"
 * event as it arrives so users see the AI agents working in real time.
 *
 * Event sequence on success:
 *   {phase:"start"}
 *   {phase:"qualifier",  status:"running"}
 *   {phase:"qualifier",  status:"complete", classification, valueProps}
 *   {phase:"competitors",status:"running"}
 *   {phase:"competitors",status:"complete", competitors}
 *   {phase:"briefing",   status:"running"}
 *   {phase:"briefing",   status:"complete", briefing}
 *   {phase:"done",       status:"complete", id}
 *
 * On error at any point:
 *   {phase:"error", message:"..."}
 *
 * Validation/auth failures still return JSON for traditional HTTP-status
 * handling on the client.
 */
export async function POST(request: Request) {
  // Parse body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Validate
  const parsed = LeadSchema.safeParse(body);
  if (!parsed.success) {
    const firstError = parsed.error.errors[0]?.message ?? "Validation error.";
    return new Response(JSON.stringify({ error: firstError }), {
      status: 422,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Fail fast if API key is missing
  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response(
      JSON.stringify({
        error: "ANTHROPIC_API_KEY is not configured. Add it to your environment.",
      }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }

  const { businessName, websiteUrl, email, phone, adSpend, industry, headache } =
    parsed.data;

  // Build a streaming Response — the agents will fire events into this stream
  // as they complete, so the client renders each phase in real time.
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (data: unknown) => {
        try {
          controller.enqueue(encoder.encode(sseEvent(data)));
        } catch {
          // Client may have disconnected — silently swallow.
        }
      };

      try {
        send({ phase: "start", status: "running" });

        // ── Agent 1: Business Qualifier ───────────────────────────────
        send({ phase: "qualifier", status: "running" });
        const { classification, valueProps } = await qualifyBusiness(websiteUrl);
        send({
          phase: "qualifier",
          status: "complete",
          classification,
          valueProps,
        });

        // ── Agent 2: Competitor Scout ─────────────────────────────────
        send({ phase: "competitors", status: "running" });
        const competitors = await findCompetitors(
          websiteUrl,
          industry,
          classification
        );
        send({ phase: "competitors", status: "complete", competitors });

        // ── Agent 3: Strategy Writer ──────────────────────────────────
        send({ phase: "briefing", status: "running" });
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
        send({ phase: "briefing", status: "complete", briefing });

        // Persist + audit
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

        try {
          await saveLead(lead);
        } catch (storageErr) {
          console.error(
            "[/api/leads] saveLead failed (non-fatal):",
            storageErr instanceof Error ? storageErr.message : storageErr
          );
        }

        // Structured audit log — survives /tmp cold-start wipes
        console.log(
          "NEW_LEAD",
          JSON.stringify({
            id: lead.id,
            submittedAt: lead.submittedAt,
            businessName,
            websiteUrl,
            email,
            phone,
            adSpend,
            industry,
            headache,
          })
        );

        send({ phase: "done", status: "complete", id: lead.id });

        // Lead alert — ping Discord after the briefing is already delivered so
        // a slow webhook never delays the visible result. Awaited so the
        // serverless function isn't frozen before the POST completes.
        await notifyNewLead(lead);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unexpected server error.";
        console.error("[/api/leads stream]", message);
        send({ phase: "error", message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // Disable Vercel/nginx response buffering so events flush immediately
      "X-Accel-Buffering": "no",
    },
  });
}
