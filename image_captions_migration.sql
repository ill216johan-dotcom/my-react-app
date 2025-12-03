-- ============================================
-- IMAGE CAPTIONS TABLE MIGRATION
-- ============================================
-- This script creates the image_captions table for storing AI descriptions of images
-- Run this in your Supabase SQL Editor.

-- ============================================
-- 1. Create image_captions table
-- ============================================

CREATE TABLE IF NOT EXISTS image_captions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 2. Create indexes for better performance
-- ============================================

-- Index on url for faster lookups
CREATE INDEX IF NOT EXISTS idx_image_captions_url ON image_captions(url);

-- ============================================
-- 3. Set up Row Level Security (RLS) policies
-- ============================================

-- Enable RLS on image_captions table
ALTER TABLE image_captions ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can read image captions (for AI chat)
CREATE POLICY "Anyone can read image captions" ON image_captions
  FOR SELECT
  USING (true);

-- Policy: Only admins can insert/update image captions
CREATE POLICY "Admins can insert image captions" ON image_captions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update image captions" ON image_captions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete image captions" ON image_captions
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ============================================
-- 4. Create trigger to update updated_at timestamp
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_image_captions_updated_at
  BEFORE UPDATE ON image_captions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

-- Verify the migration
SELECT 
  'Migration completed successfully!' AS status,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'image_captions') AS image_captions_table_exists;

