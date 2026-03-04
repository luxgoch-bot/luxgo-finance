-- ==========================================
-- LuxGo Finance - MWST Deadlines & Periods
-- ==========================================

-- MWST Reporting Periods
-- Stores the quarterly VAT reporting windows and their deadlines
CREATE TABLE IF NOT EXISTS mwst_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  quarter INTEGER NOT NULL CHECK (quarter IN (1, 2, 3, 4)),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  submission_deadline DATE NOT NULL,
  payment_deadline DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'submitted', 'overdue', 'paid')),
  submitted_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (profile_id, year, quarter)
);

-- MWST Deadline Reminders
-- Tracks notification state so we don't spam the user
CREATE TABLE IF NOT EXISTS mwst_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id UUID REFERENCES mwst_periods(id) ON DELETE CASCADE,
  reminder_type TEXT NOT NULL
    CHECK (reminder_type IN ('30_days', '14_days', '7_days', '1_day', 'overdue')),
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  channel TEXT DEFAULT 'app'   -- 'app', 'email', 'telegram'
);

-- Swiss MWST Standard Deadlines (reference table, not profile-specific)
-- Quarter N: deadline is 60 days after quarter end
CREATE TABLE IF NOT EXISTS mwst_deadline_rules (
  id SERIAL PRIMARY KEY,
  quarter INTEGER NOT NULL CHECK (quarter IN (1, 2, 3, 4)),
  quarter_end_month INTEGER NOT NULL,   -- month the quarter ends (3, 6, 9, 12)
  days_to_submit INTEGER NOT NULL DEFAULT 60,
  days_to_pay INTEGER NOT NULL DEFAULT 60,
  description TEXT
);

-- Seed standard Swiss MWST deadline rules
INSERT INTO mwst_deadline_rules (quarter, quarter_end_month, days_to_submit, days_to_pay, description)
VALUES
  (1, 3,  60, 60, 'Q1 (Jan–Mar): submission and payment due by 31 May'),
  (2, 6,  60, 60, 'Q2 (Apr–Jun): submission and payment due by 31 Aug'),
  (3, 9,  60, 60, 'Q3 (Jul–Sep): submission and payment due by 30 Nov'),
  (4, 12, 60, 60, 'Q4 (Oct–Dec): submission and payment due by 28 Feb following year')
ON CONFLICT DO NOTHING;

-- ==========================================
-- Row Level Security
-- ==========================================

ALTER TABLE mwst_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE mwst_reminders ENABLE ROW LEVEL SECURITY;

-- mwst_deadline_rules is a public reference table — no RLS needed
-- (read-only, no user data)

CREATE POLICY "mwst_periods_own" ON mwst_periods
  USING (profile_id IN (SELECT my_profile_ids()))
  WITH CHECK (profile_id IN (SELECT my_profile_ids()));

CREATE POLICY "mwst_reminders_own" ON mwst_reminders
  USING (
    period_id IN (
      SELECT id FROM mwst_periods
      WHERE profile_id IN (SELECT my_profile_ids())
    )
  )
  WITH CHECK (
    period_id IN (
      SELECT id FROM mwst_periods
      WHERE profile_id IN (SELECT my_profile_ids())
    )
  );

-- ==========================================
-- Indexes
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_mwst_periods_profile_id ON mwst_periods(profile_id);
CREATE INDEX IF NOT EXISTS idx_mwst_periods_year_quarter ON mwst_periods(year, quarter);
CREATE INDEX IF NOT EXISTS idx_mwst_periods_deadline ON mwst_periods(submission_deadline);
CREATE INDEX IF NOT EXISTS idx_mwst_reminders_period_id ON mwst_reminders(period_id);

-- ==========================================
-- Updated-at trigger
-- ==========================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER mwst_periods_updated_at
  BEFORE UPDATE ON mwst_periods
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
