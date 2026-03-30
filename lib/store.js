import { neon } from "@neondatabase/serverless";

const DEFAULT_DAILY_DATA = {
  startDate: null,
  days: {}
};

const DEFAULT_REVISION_DATA = {
  problems: []
};

const DEFAULTS = {
  daily: DEFAULT_DAILY_DATA,
  revision: DEFAULT_REVISION_DATA
};

let initialized = false;

function getSql() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set. Add your Neon/Vercel Postgres connection string before running the API.");
  }
  return neon(process.env.DATABASE_URL);
}

async function ensureTable() {
  if (initialized) return;
  const sql = getSql();
  await sql`
    CREATE TABLE IF NOT EXISTS tracker_documents (
      key TEXT PRIMARY KEY,
      data JSONB NOT NULL DEFAULT '{}'::jsonb,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  initialized = true;
}

function cloneDefault(key) {
  return JSON.parse(JSON.stringify(DEFAULTS[key]));
}

export async function getTrackerDocument(key) {
  await ensureTable();
  const sql = getSql();
  const rows = await sql`
    SELECT data
    FROM tracker_documents
    WHERE key = ${key}
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) {
    return cloneDefault(key);
  }
  return {
    ...cloneDefault(key),
    ...row.data
  };
}

export async function saveTrackerDocument(key, data) {
  await ensureTable();
  const sql = getSql();
  const merged = {
    ...cloneDefault(key),
    ...data
  };
  await sql`
    INSERT INTO tracker_documents (key, data, updated_at)
    VALUES (${key}, ${JSON.stringify(merged)}::jsonb, NOW())
    ON CONFLICT (key)
    DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()
  `;
  return merged;
}

export { DEFAULT_DAILY_DATA, DEFAULT_REVISION_DATA };
