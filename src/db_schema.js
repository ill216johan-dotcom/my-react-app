/**
 * DATABASE SCHEMA DOCUMENTATION
 * 
 * This file documents the Supabase database structure for reference.
 * 
 * ============================================
 * TABLE: profiles
 * ============================================
 * Columns:
 * - id (uuid, primary key, references auth.users)
 * - role (text) - Options: 'admin', 'manager', 'packer', 'client'
 * - full_name (text)
 * - created_at (timestamp)
 * - updated_at (timestamp)
 * 
 * Note: This table is automatically populated via a database trigger when
 * a new user signs up. The trigger picks up the full_name from auth metadata.
 * 
 * ============================================
 * TABLE: orders
 * ============================================
 * Columns:
 * - id (uuid, primary key)
 * - client_id (uuid, foreign key references profiles.id)
 * - title (text)
 * - description (text)
 * - status (text) - e.g., 'searching', 'booked', 'in_progress', 'completed', 'cancelled'
 * - budget (numeric)
 * - deadline (timestamp)
 * - items (jsonb) - Array of order items with details
 * - accepted_packer_id (uuid, foreign key references profiles.id) - The packer hired for this order
 * - is_disputed (boolean) - Whether arbitration has been called
 * - created_at (timestamp)
 * - updated_at (timestamp)
 * 
 * ============================================
 * TABLE: bids
 * ============================================
 * Columns:
 * - id (uuid, primary key)
 * - order_id (uuid, foreign key references orders.id)
 * - packer_id (uuid, foreign key references profiles.id)
 * - price (numeric)
 * - days_to_complete (integer)
 * - comment (text)
 * - status (text) - e.g., 'pending', 'accepted', 'rejected'
 * - created_at (timestamp)
 * - updated_at (timestamp)
 * 
 * ============================================
 * TABLE: messages
 * ============================================
 * Columns:
 * - id (uuid, primary key)
 * - order_id (uuid, foreign key references orders.id)
 * - sender_id (uuid, foreign key references profiles.id)
 * - relevant_packer_id (uuid, foreign key references profiles.id) - Used for pre-booking chats
 * - content (text) - Message text
 * - is_system_message (boolean) - Whether this is a system-generated message
 * - created_at (timestamp)
 */

// Export constants for use in the application
export const USER_ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  PACKER: 'packer',
  CLIENT: 'client'
};

export const ORDER_STATUSES = {
  OPEN: 'open',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
};

export const BID_STATUSES = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected'
};

