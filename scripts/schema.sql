CREATE TABLE IF NOT EXISTS tracker_documents (
  key TEXT PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO tracker_documents (key, data)
VALUES
  ('daily', '{"startDate": null, "days": {}}'::jsonb),
  ('revision', '{"problems": []}'::jsonb)
ON CONFLICT (key) DO NOTHING;
