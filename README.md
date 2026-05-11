# Pacific Growth Co — Landing Page

AI-powered lead qualifier for Pacific Growth Co marketing agency.

**Live:** https://pacific-growth-co.vercel.app

## What it does

Visitor fills out a form (business name, website, email, daily ad spend, industry, headache). Backend runs a 3-step AI flow:

1. **Haiku** fetches the homepage and classifies the business
2. **Haiku** identifies 3 likely competitors
3. **Sonnet** writes a 3-paragraph custom briefing in Liam's voice

The briefing returns to the user inline (~15s end-to-end). Lead is logged to Vercel runtime logs (`NEW_LEAD` entries) and saved best-effort to `/tmp`.

## Environment variables

| Variable | Required | Notes |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | Get from console.anthropic.com — needed for the AI flow |
| `ADMIN_TOKEN` | Optional | Any long random string. Unlocks `/admin/leads?token=...` for viewing recent submissions |

## Admin view

Visit `/admin/leads?token=YOUR_ADMIN_TOKEN` to see recent leads in this serverless instance. Shows the full briefing each visitor received, plus their contact info and AI classification.

**Caveats:**
- Reads from `/tmp` on Vercel — only sees leads from the current function instance. Cold start = wiped.
- For the full audit trail, check **Vercel Runtime Logs** and filter for `NEW_LEAD`. Every successful submission logs a structured JSON line.

## Local dev

```bash
npm install
cp .env.example .env.local
# Add ANTHROPIC_API_KEY (and optionally ADMIN_TOKEN) to .env.local
npm run dev
# Open http://localhost:3000
```

Local leads save to `data/leads.json` and `data/notifications.log` (both gitignored).

## Build & deploy

```bash
npm run build
npm start
```

Vercel deploy is auto-wired via GitHub — every push to `main` triggers a redeploy.

## Production roadmap (not yet implemented)

The current build works end-to-end but is not production-ready for paying clients:

| Gap | Impact | Suggested fix |
|---|---|---|
| Leads in `/tmp` get wiped on cold start (~minutes idle) | Lose leads | Swap `lib/leads.ts` to **Vercel Postgres** (free tier) or **Supabase** |
| No notification on new lead | You don't know a lead arrived unless you check logs | Wire **Resend** email or **Telegram bot** (Liam has JARVIS bot infra) |
| No custom domain | URL is `*.vercel.app` | Buy `pacificgrowth.co` (or similar) and point at Vercel |
| No rate limiting on `/api/leads` | Form-spam burns Anthropic credits | Add **Upstash Redis** rate limit, ~10 reqs/min/IP |
| No analytics | Don't know visitor → submission conversion | Add **Vercel Analytics** (one toggle, free tier) |
| Lead form has no spam protection | Bots will submit garbage | Add honeypot field + Turnstile / hCaptcha |

## Architecture

```
Browser  →  Next.js 14 App Router  →  /api/leads route
                                       ↓
                                    Zod validation
                                       ↓
                                    qualifyBusiness (Haiku + SSRF-guarded homepage fetch)
                                    findCompetitors (Haiku)
                                    generateBriefing (Sonnet, 600 max_tokens)
                                       ↓
                                    saveLead → /tmp/pacific-growth-co/leads.json (best-effort)
                                    console.log NEW_LEAD → Vercel runtime logs (always)
                                       ↓
                                    Return { briefing, competitors, classification }
```

Key files:
- `app/page.tsx` — landing page composition
- `components/{Hero,WhatYouGet,HowItWorks,LeadForm,Footer}.tsx`
- `app/api/leads/route.ts` — main API endpoint
- `app/admin/leads/page.tsx` — gated admin view
- `lib/ai.ts` — Anthropic SDK calls + markdown-fence stripping
- `lib/leads.ts` — storage (auto-routes to `/tmp` on serverless, `./data` locally)
