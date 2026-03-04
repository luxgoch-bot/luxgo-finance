-- ==========================================
-- LuxGo Finance - User Settings + Storage
-- ==========================================

-- User Settings
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users ON DELETE CASCADE UNIQUE,
  default_vat_rate NUMERIC(5,2) DEFAULT 8.1,
  mwst_reminder_30d BOOLEAN DEFAULT true,
  mwst_reminder_7d BOOLEAN DEFAULT true,
  mwst_reminder_1d BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "settings_own" ON user_settings
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);

CREATE TRIGGER user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ==========================================
-- Supabase Storage Bucket
-- ==========================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'luxgo-finance-docs',
  'luxgo-finance-docs',
  false,
  52428800,
  ARRAY['image/jpeg','image/png','image/webp','image/gif','application/pdf','text/csv','application/vnd.ms-excel']
) ON CONFLICT (id) DO NOTHING;

-- Storage RLS
CREATE POLICY "docs_upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'luxgo-finance-docs'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "docs_read" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'luxgo-finance-docs'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "docs_delete" ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'luxgo-finance-docs'
    AND (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.profiles WHERE user_id = auth.uid()
    )
  );
