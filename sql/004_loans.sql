-- ==========================================
-- LuxGo Finance - Loans & Repayments
-- ==========================================

CREATE TABLE IF NOT EXISTS loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  tax_year_id UUID REFERENCES tax_years(id) ON DELETE SET NULL,
  provider TEXT NOT NULL,
  description TEXT,
  loan_type TEXT CHECK (loan_type IN (
    'personal', 'business', 'mortgage', 'vehicle', 'other'
  )),
  original_amount NUMERIC(12,2) NOT NULL,
  interest_rate NUMERIC(5,3) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  currency TEXT DEFAULT 'CHF',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS loan_repayments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id UUID REFERENCES loans(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_payment NUMERIC(12,2) NOT NULL,
  capital_amount NUMERIC(12,2) NOT NULL,
  interest_amount NUMERIC(12,2) NOT NULL,
  outstanding_balance NUMERIC(12,2),
  notes TEXT,
  receipt_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- Row Level Security
-- ==========================================

ALTER TABLE loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_repayments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "loans_own" ON loans
  USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()))
  WITH CHECK (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "loan_repayments_own" ON loan_repayments
  USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()))
  WITH CHECK (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- ==========================================
-- Indexes
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_loans_profile_id ON loans(profile_id);
CREATE INDEX IF NOT EXISTS idx_loans_tax_year_id ON loans(tax_year_id);
CREATE INDEX IF NOT EXISTS idx_loan_repayments_loan_id ON loan_repayments(loan_id);
CREATE INDEX IF NOT EXISTS idx_loan_repayments_profile_id ON loan_repayments(profile_id);
CREATE INDEX IF NOT EXISTS idx_loan_repayments_date ON loan_repayments(date);
