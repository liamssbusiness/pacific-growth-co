# Pacific Growth Co — Landing Page

AI-powered lead qualifier for Pacific Growth Co marketing agency.

## Setup

```bash
npm install
cp .env.example .env.local
# Edit .env.local and add your Anthropic API key
```

## Environment variables

| Variable | Required | Notes |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | Get from console.anthropic.com |

## Dev

```bash
npm run dev
# Open http://localhost:3000
```

## Build

```bash
npm run build
npm start
```

## Where leads are saved

- `data/leads.json` — full JSON array of all lead submissions + AI output
- `data/notifications.log` — one line per lead: timestamp, business name, email

Both files are gitignored and created automatically on first submission.

## Deploy to Vercel

1. Push to a GitHub repo
2. Import at vercel.com
3. Set `ANTHROPIC_API_KEY` as an environment variable in the Vercel dashboard
4. Deploy

Note: `data/leads.json` writes to the local filesystem. On Vercel (serverless), the `/tmp` dir is ephemeral. For production persistence, swap `lib/leads.ts` to write to a database (Supabase, PlanetScale, etc.) or an S3-compatible store.

## AI flow (per submission)

1. Haiku fetches the homepage and classifies the business
2. Haiku identifies 3 likely competitors
3. Sonnet writes a 3-paragraph custom briefing in Liam's voice
4. Lead + briefing saved to `data/leads.json`
