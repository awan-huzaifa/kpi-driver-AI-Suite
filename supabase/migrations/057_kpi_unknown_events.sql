-- Catch-all table for KPI webhook payloads whose `type` is not yet in the registry.
-- Lets super admins see what GHL is sending before a handler is written.

CREATE TABLE IF NOT EXISTS kpi_unknown_events (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id text,
  event_type  text,
  payload     jsonb       NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE kpi_unknown_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY kpi_unknown_events_super_admin ON kpi_unknown_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid() AND u.access_role = 'super_admin'
    )
  );
