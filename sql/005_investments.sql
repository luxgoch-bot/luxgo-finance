-- ==========================================
-- LuxGo Finance - Investments (Stocks & Crypto)
-- Swiss tax: Capital gains = TAX FREE (private investors)
-- Dividends/Interest = TAXABLE income
-- All holdings must be declared for Vermögenssteuer
-- ==========================================

CREATE TABLE IF NOT EXISTS investment_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  broker TEXT,
  account_type TEXT CHECK (account_type IN ('stocks', 'crypto', 'etf', 'bonds', 'mixed')),
  currency TEXT DEFAULT 'CHF',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS investment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES investment_accounts(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  tax_year_id UUID REFERENCES tax_years(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  type TEXT CHECK (type IN ('buy', 'sell', 'dividend', 'interest', 'fee')),
  asset_name TEXT NOT NULL,
  asset_ticker TEXT,
  asset_type TEXT CHECK (asset_type IN ('stock', 'etf', 'crypto', 'bond', 'other')),
  quantity NUMERIC(18,8),
  price_per_unit NUMERIC(18,8),
  total_amount_chf NUMERIC(12,2) NOT NULL,
  fees_chf NUMERIC(12,2) DEFAULT 0,
  exchange_rate NUMERIC(12,6) DEFAULT 1,
  notes TEXT,
  receipt_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS investment_holdings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES investment_accounts(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  asset_name TEXT NOT NULL,
  asset_ticker TEXT,
  asset_type TEXT,
  quantity NUMERIC(18,8),
  average_buy_price NUMERIC(18,8),
  current_value_chf NUMERIC(12,2),
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- Row Level Security
-- ==========================================

ALTER TABLE investment_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE investment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE investment_holdings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "investment_accounts_own" ON investment_accounts
  USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()))
  WITH CHECK (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "investment_transactions_own" ON investment_transactions
  USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()))
  WITH CHECK (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "investment_holdings_own" ON investment_holdings
  USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()))
  WITH CHECK (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- ==========================================
-- Indexes
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_inv_accounts_profile ON investment_accounts(profile_id);
CREATE INDEX IF NOT EXISTS idx_inv_transactions_account ON investment_transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_inv_transactions_profile ON investment_transactions(profile_id);
CREATE INDEX IF NOT EXISTS idx_inv_transactions_date ON investment_transactions(date);
CREATE INDEX IF NOT EXISTS idx_inv_holdings_account ON investment_holdings(account_id);
CREATE INDEX IF NOT EXISTS idx_inv_holdings_profile ON investment_holdings(profile_id);
