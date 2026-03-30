# Siddhesh Trackers

Vercel-ready tracker app with:

- `/` for the daily tracker
- `/revision` for the DSA revision tracker
- Vercel Functions for save/load
- Neon-backed Postgres on Vercel for durable storage

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create a Neon Postgres database or attach the current Vercel Postgres integration backed by Neon.

Set `DATABASE_URL` for local and Vercel environments.

3. Run the schema in [`scripts/schema.sql`](./scripts/schema.sql).

4. Start locally:

```bash
npm run dev
```

## Storage Model

The current version stores each tracker as a JSONB document in Postgres:

- `daily`
- `revision`

That keeps the migration simple while still giving you real cloud persistence. If you want, we can later normalize this into separate relational tables for problems, revisions, and daily logs.

## Deploy to Vercel

1. Push this folder to GitHub.
2. Import the repo into Vercel.
3. Add `DATABASE_URL` in Vercel project settings.
4. Deploy.

## Important Files

- [`app/page.js`](./app/page.js)
- [`app/revision/page.js`](./app/revision/page.js)
- [`app/api/daily/route.js`](./app/api/daily/route.js)
- [`app/api/revision/route.js`](./app/api/revision/route.js)
- [`lib/store.js`](./lib/store.js)
