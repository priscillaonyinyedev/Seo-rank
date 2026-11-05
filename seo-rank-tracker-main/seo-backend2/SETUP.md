# Rank Pilot Backend — Setup Guide

This is a step-by-step guide to get what's been built so far running on your
own computer. Follow it in order.

## What you need installed first

- **Node.js** (v18 or newer) — https://nodejs.org (download the LTS version)
- **MongoDB** — easiest option: create a free cluster at https://www.mongodb.com/cloud/atlas
  (no local install needed). Alternative: install MongoDB locally.
- **Redis** — easiest option: free instance at https://redis.com/try-free/
  (or https://upstash.com). Alternative: install Redis locally.

You do NOT need Gemini or a SERP API key yet — those are stubbed out so the
app runs without them.

## Step 1 — Unzip and install dependencies

```bash
unzip seo-backend.zip -d seo-backend
cd seo-backend
npm install
```

This downloads all the libraries the code depends on (Express, Mongoose,
etc.) into a `node_modules` folder. This step needs internet access and
may take a minute or two.

## Step 2 — Install the headless browser

The audit worker uses Playwright to load pages for scanning. It needs a
one-time download of the actual browser it controls:

```bash
npx playwright install chromium
```

## Step 3 — Set up your environment file

```bash
cp .env.example .env
```

Open `.env` in a text editor and fill in:
- `MONGO_URI` — the connection string from MongoDB Atlas (or `mongodb://localhost:27017/rank-pilot` if running locally)
- `REDIS_URL` — the connection string from your Redis provider (or `redis://localhost:6379` if running locally)
- `JWT_SECRET` — replace with any long random string (e.g. run `openssl rand -hex 32` in your terminal and paste the output)

Leave `GEMINI_API_KEY` and `SERP_API_KEY` blank for now.

## Step 4 — Start the API server

```bash
npm run dev
```

You should see:
```
[db] Connected to MongoDB (rank-pilot)
[server] Listening on http://localhost:4000
```

Test it's alive by visiting `http://localhost:4000/health` in your browser —
you should see `{"ok":true}`.

## Step 5 — Start the worker (in a second terminal)

The worker is a separate process that processes scan jobs. Open a new
terminal window/tab, `cd` into the same folder, then:

```bash
npm run worker
```

You should see `[audit-worker] Listening for analysis jobs` and
`[rank-worker] Listening for rank-check jobs`.

## Step 5b — Start the scheduler (a third terminal, optional for now)

This is the process that enqueues a rank check for every active tracked
keyword once a day (6:00 AM UTC — matching the copy already in the front
end). You don't need this running to test things manually (the "Track
Keyword" and "Refresh" buttons enqueue checks immediately on their own),
but it's what makes the daily tracking actually automatic:

```bash
npm run scheduler
```

## Step 6 — Try it with a real request

With both processes running, test the auth flow first:

```bash
curl -X POST http://localhost:4000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"testpass123"}'
```

You should get back a `token` and a `user` object. Copy the token, then try
submitting a site for analysis:

```bash
curl -X POST http://localhost:4000/analyses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer PASTE_YOUR_TOKEN_HERE" \
  -d '{"url":"https://example.com"}'
```

You should get back a record with `"status":"pending"`. Watch the worker's
terminal — you'll see it pick up the job. After ~10-20 seconds, fetch the
result:

```bash
curl http://localhost:4000/analyses/PASTE_THE_ID_FROM_ABOVE \
  -H "Authorization: Bearer PASTE_YOUR_TOKEN_HERE"
```

You should see `"status":"completed"` with a full report.

## If something breaks

- **"Failed to connect to MongoDB"** — double check `MONGO_URI` in `.env`, and that your Atlas cluster allows connections from your IP (Atlas has a network access setting for this).
- **"ECONNREFUSED" on Redis** — same idea, check `REDIS_URL`.
- **Playwright errors about missing browser** — re-run `npx playwright install chromium`.
- **Worker never picks up the job** — make sure both `npm run dev` AND `npm run worker` are running at the same time, in separate terminals.

## Connecting the front end

The frontend uses `VITE_API_URL` as the API origin and sends the JWT token in
an `Authorization: Bearer <token>` header. For local development, set it to
`http://localhost:4000` in the frontend environment. For deployment, set it
to the public API origin and set this backend's `CLIENT_ORIGIN` to the public
frontend origin. The API server, worker, and scheduler must run as separate
processes; the Vercel config deploys only the frontend.
