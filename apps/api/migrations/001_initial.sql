-- Applied idempotently by PostgresStore.load before the API accepts connections.
CREATE TABLE IF NOT EXISTS vrille_rooms (
  code text PRIMARY KEY,
  state jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS vrille_rooms_updated ON vrille_rooms(updated_at);
CREATE TABLE IF NOT EXISTS vrille_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS vrille_migrations (
  version integer PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO vrille_migrations(version) VALUES (1) ON CONFLICT DO NOTHING;
