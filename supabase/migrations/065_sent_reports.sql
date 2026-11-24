CREATE TABLE sent_reports (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        uuid        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  recipient_user_id uuid        REFERENCES users(id) ON DELETE SET NULL,
  recipient_email   text        NOT NULL,
  app               text        NOT NULL, -- 'sales_coach' | 'training_coach' | 'underwriting'
  variant           text        NOT NULL, -- 'team' | 'rep' | 'rep_copy'
  subject           text        NOT NULL,
  html_content      text        NOT NULL,
  period_label      text        NOT NULL,
  period_from       timestamptz NOT NULL,
  period_to         timestamptz NOT NULL,
  sent_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX sent_reports_company_id_idx ON sent_reports(company_id);
CREATE INDEX sent_reports_sent_at_idx    ON sent_reports(sent_at DESC);

ALTER TABLE sent_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_select_own_company" ON sent_reports
  FOR SELECT USING (
    company_id = (SELECT company_id FROM users WHERE id = auth.uid() LIMIT 1)
    AND (SELECT access_role FROM users WHERE id = auth.uid() LIMIT 1) IN ('admin', 'super_admin')
  );

CREATE POLICY "super_admin_select_all" ON sent_reports
  FOR SELECT USING (
    (SELECT access_role FROM users WHERE id = auth.uid() LIMIT 1) = 'super_admin'
  );
