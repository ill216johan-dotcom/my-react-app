-- ============================================
-- DATABASE MIGRATION SCRIPT
-- Real-time Chat & Arbitration System
-- ============================================
-- This script adds the necessary tables and columns for the chat and arbitration system.
-- Run this in your Supabase SQL Editor.

-- ============================================
-- 1. Add columns to orders table
-- ============================================

-- Add accepted_packer_id column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'accepted_packer_id'
  ) THEN
    ALTER TABLE orders ADD COLUMN accepted_packer_id UUID REFERENCES profiles(id);
  END IF;
END $$;

-- Add is_disputed column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'is_disputed'
  ) THEN
    ALTER TABLE orders ADD COLUMN is_disputed BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- ============================================
-- 2. Create messages table
-- ============================================

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  relevant_packer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  is_system_message BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 3. Create indexes for better performance
-- ============================================

-- Index on order_id for faster message retrieval
CREATE INDEX IF NOT EXISTS idx_messages_order_id ON messages(order_id);

-- Index on relevant_packer_id for pre-booking chat filtering
CREATE INDEX IF NOT EXISTS idx_messages_relevant_packer_id ON messages(relevant_packer_id);

-- Index on created_at for chronological ordering
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- Composite index for efficient filtering by order and packer
CREATE INDEX IF NOT EXISTS idx_messages_order_packer ON messages(order_id, relevant_packer_id);

-- Index on is_disputed for manager views
CREATE INDEX IF NOT EXISTS idx_orders_is_disputed ON orders(is_disputed) WHERE is_disputed = TRUE;

-- ============================================
-- 4. Set up Row Level Security (RLS) policies
-- ============================================

-- Enable RLS on messages table
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read messages from orders they're involved in
CREATE POLICY "Users can read their order messages" ON messages
  FOR SELECT
  USING (
    -- User is the client of the order
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = messages.order_id 
      AND orders.client_id = auth.uid()
    )
    OR
    -- User is the sender of the message
    sender_id = auth.uid()
    OR
    -- User is the relevant packer
    relevant_packer_id = auth.uid()
    OR
    -- User is the accepted packer for the order
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = messages.order_id
      AND orders.accepted_packer_id = auth.uid()
    )
    OR
    -- User is a manager or admin
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('manager', 'admin')
    )
  );

-- Policy: Users can insert messages to orders they're involved in
CREATE POLICY "Users can send messages" ON messages
  FOR INSERT
  WITH CHECK (
    -- User is the client of the order
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = messages.order_id 
      AND orders.client_id = auth.uid()
    )
    OR
    -- User is the relevant packer
    relevant_packer_id = auth.uid()
    OR
    -- User is the accepted packer for the order
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = messages.order_id
      AND orders.accepted_packer_id = auth.uid()
    )
    OR
    -- User is a manager or admin
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('manager', 'admin')
    )
  );

-- ============================================
-- 5. Create helper function to get disputed orders (for managers)
-- ============================================

CREATE OR REPLACE FUNCTION get_disputed_orders()
RETURNS TABLE (
  order_id UUID,
  title TEXT,
  client_id UUID,
  client_name TEXT,
  accepted_packer_id UUID,
  packer_name TEXT,
  status TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  deadline TIMESTAMP WITH TIME ZONE
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only allow managers and admins to call this function
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('manager', 'admin')
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only managers and admins can access disputed orders';
  END IF;

  RETURN QUERY
  SELECT 
    o.id,
    o.title,
    o.client_id,
    c.full_name,
    o.accepted_packer_id,
    p.full_name,
    o.status,
    o.created_at,
    o.deadline
  FROM orders o
  LEFT JOIN profiles c ON c.id = o.client_id
  LEFT JOIN profiles p ON p.id = o.accepted_packer_id
  WHERE o.is_disputed = TRUE
  ORDER BY o.created_at DESC;
END;
$$;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

-- Verify the migration
SELECT 
  'Migration completed successfully!' AS status,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'messages') AS messages_table_exists,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'is_disputed') AS is_disputed_column_exists,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'accepted_packer_id') AS accepted_packer_id_column_exists;





