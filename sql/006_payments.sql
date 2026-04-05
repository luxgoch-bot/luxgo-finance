-- ==========================================
-- LuxGo Finance - Payments Table
-- Store Stripe payment events for tracking
-- ==========================================

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- e.g., payment_intent.succeeded, payment_intent.failed
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT DEFAULT 'CHF',
  status TEXT CHECK (status IN ('succeeded', 'failed', 'pending', 'canceled')),
  customer_email TEXT,
  booking_id UUID, -- Reference to booking if available
  stripe_payment_intent_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  stripe_event_id TEXT UNIQUE,
  metadata JSONB, -- Store additional event data
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- Row Level Security
-- ==========================================

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payments_own" ON payments
  USING (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()))
  WITH CHECK (profile_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

-- ==========================================
-- Indexes for performance
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_payments_profile_id ON payments(profile_id);
CREATE INDEX IF NOT EXISTS idx_payments_event_type ON payments(event_type);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);
CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_payment_intent_id ON payments(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_payments_stripe_event_id ON payments(stripe_event_id);