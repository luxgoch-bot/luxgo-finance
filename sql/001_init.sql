-- ==========================================
-- LuxGo Finance - Initial Database Schema
-- ==========================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Profiles (both business and personal)
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users,
  type TEXT CHECK (type IN ('business', 'personal')),
  name TEXT NOT NULL,
  uid_mwst TEXT,       -- e.g. CHE-123.456.789 MWST
  address TEXT,
  canton TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tax Years
CREATE TABLE tax_years (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id),
  year INTEGER NOT NULL,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'submitted', 'closed')),
  notes TEXT
);

-- Income Records
CREATE TABLE income (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id),
  tax_year_id UUID REFERENCES tax_years(id),
  date DATE NOT NULL,
  description TEXT,
  client TEXT,
  amount_chf NUMERIC(12,2) NOT NULL,
  vat_rate NUMERIC(5,2) DEFAULT 8.1,
  vat_amount NUMERIC(12,2),
  net_amount NUMERIC(12,2),
  category TEXT CHECK (category IN ('transport', 'charter', 'other')),
  invoice_number TEXT,
  receipt_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Expense Records
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id),
  tax_year_id UUID REFERENCES tax_years(id),
  date DATE NOT NULL,
  description TEXT,
  vendor TEXT,
  amount_chf NUMERIC(12,2) NOT NULL,
  vat_rate NUMERIC(5,2) DEFAULT 8.1,
  vat_amount NUMERIC(12,2),
  net_amount NUMERIC(12,2),
  category TEXT CHECK (category IN (
    'vehicle', 'fuel', 'insurance', 'maintenance', 'office',
    'marketing', 'salary', 'tax', 'other'
  )),
  is_deductible BOOLEAN DEFAULT true,
  receipt_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- MWST (VAT) Quarterly Reports
CREATE TABLE mwst_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id),
  tax_year_id UUID REFERENCES tax_years(id),
  quarter INTEGER CHECK (quarter IN (1,2,3,4)),
  total_revenue_chf NUMERIC(12,2),
  vat_collected NUMERIC(12,2),
  vat_paid_on_expenses NUMERIC(12,2),
  vat_payable NUMERIC(12,2),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted')),
  submitted_at TIMESTAMPTZ,
  notes TEXT
);

-- Documents (receipts, invoices, tax forms)
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id),
  type TEXT CHECK (type IN ('receipt', 'invoice', 'tax_form', 'other')),
  file_name TEXT,
  storage_path TEXT,
  linked_to UUID,     -- can reference income or expense id
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- Row Level Security
-- ==========================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE income ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE mwst_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Profiles: users can only see/edit their own profile
CREATE POLICY "profiles_own" ON profiles
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Helper: get all profile ids for the current user
CREATE OR REPLACE FUNCTION my_profile_ids()
RETURNS SETOF UUID LANGUAGE sql STABLE AS $$
  SELECT id FROM profiles WHERE user_id = auth.uid();
$$;

-- Tax Years
CREATE POLICY "tax_years_own" ON tax_years
  USING (profile_id IN (SELECT my_profile_ids()))
  WITH CHECK (profile_id IN (SELECT my_profile_ids()));

-- Income
CREATE POLICY "income_own" ON income
  USING (profile_id IN (SELECT my_profile_ids()))
  WITH CHECK (profile_id IN (SELECT my_profile_ids()));

-- Expenses
CREATE POLICY "expenses_own" ON expenses
  USING (profile_id IN (SELECT my_profile_ids()))
  WITH CHECK (profile_id IN (SELECT my_profile_ids()));

-- MWST Reports
CREATE POLICY "mwst_reports_own" ON mwst_reports
  USING (profile_id IN (SELECT my_profile_ids()))
  WITH CHECK (profile_id IN (SELECT my_profile_ids()));

-- Documents
CREATE POLICY "documents_own" ON documents
  USING (profile_id IN (SELECT my_profile_ids()))
  WITH CHECK (profile_id IN (SELECT my_profile_ids()));

-- ==========================================
-- Indexes for performance
-- ==========================================
CREATE INDEX idx_profiles_user_id ON profiles(user_id);
CREATE INDEX idx_tax_years_profile_id ON tax_years(profile_id);
CREATE INDEX idx_income_profile_id ON income(profile_id);
CREATE INDEX idx_income_tax_year_id ON income(tax_year_id);
CREATE INDEX idx_income_date ON income(date);
CREATE INDEX idx_expenses_profile_id ON expenses(profile_id);
CREATE INDEX idx_expenses_tax_year_id ON expenses(tax_year_id);
CREATE INDEX idx_expenses_date ON expenses(date);
CREATE INDEX idx_mwst_profile_id ON mwst_reports(profile_id);
CREATE INDEX idx_documents_profile_id ON documents(profile_id);
