# Real-time Chat & Arbitration System - Setup Guide

## Overview

This document provides a complete guide to setting up and using the Real-time Chat & Arbitration System for your marketplace platform.

## Features Implemented

### 1. **Real-time Messaging**
- Instant message delivery using Supabase Realtime channels
- Context-aware chat rooms based on order status
- Support for Client-Packer communication
- Manager oversight for disputed orders

### 2. **Chat Context ("Room" Concept)**

#### **Status: 'searching'** (Pre-booking)
- Client can view bids from multiple Packers
- Clicking a bid opens a dedicated chat with THAT specific Packer
- Each Packer has their own separate chat room with the Client
- `relevant_packer_id` field identifies which Packer's chat room

#### **Status: 'booked'** (After hiring)
- Single chat room between Client and the hired Packer
- `accepted_packer_id` field identifies the hired Packer
- Previous bid chats become inactive

### 3. **"Hire This Packer" Feature**
- **Location**: Chat header (only visible during 'searching' status)
- **Who sees it**: Clients only
- **Functionality**: 
  - Accepts the bid from the Packer you're chatting with
  - Updates order status to 'booked'
  - Sets `accepted_packer_id` in the orders table
  - Rejects other pending bids

### 4. **Arbitration System**

#### **Trigger Conditions**
The "Call Arbitration" button appears when:
- Order status is 'booked' OR 'completed'
- AND `is_disputed` is false (not already in dispute)
- AND (Current Date > Deadline OR User is unhappy)

#### **What Happens When Called**
1. Updates `orders.is_disputed = true`
2. Inserts a system message: "Arbitration started. A Manager has been summoned. 🚨"
3. Order appears in Manager Dashboard's "Disputed Orders" tab
4. Managers can view the chat and resolve the dispute

#### **Manager Resolution**
- Managers see all disputed orders
- Can view full chat history
- Can send messages to both parties
- Can mark dispute as resolved

### 5. **UI Features**
- Modern messenger-style interface
- Messages on right (sender) and left (recipient)
- System messages displayed in center with distinct styling (yellow badge)
- Real-time scroll to latest message
- Timestamp formatting (relative for recent, absolute for older)
- Visual indicators for disputed orders (red badges and borders)
- Loading states and empty states

## Database Setup

### Step 1: Run the Migration Script

Execute the SQL migration in your Supabase SQL Editor:

```bash
# Navigate to your Supabase project
# Dashboard > SQL Editor > New Query
# Copy and paste the contents of database_migrations.sql
# Click "Run"
```

The migration script will:
1. Add `accepted_packer_id` column to `orders` table
2. Add `is_disputed` column to `orders` table
3. Create `messages` table
4. Set up indexes for performance
5. Configure Row Level Security (RLS) policies
6. Create helper function for disputed orders

### Step 2: Verify Migration

After running the migration, you should see:
- ✅ `messages` table created
- ✅ `is_disputed` column in `orders` table
- ✅ `accepted_packer_id` column in `orders` table

### Database Schema

#### **messages** table
```sql
- id (uuid, primary key)
- order_id (uuid, references orders.id)
- sender_id (uuid, references profiles.id)
- relevant_packer_id (uuid, references profiles.id)
- content (text)
- is_system_message (boolean)
- created_at (timestamp)
```

#### **orders** table (updated columns)
```sql
- accepted_packer_id (uuid, references profiles.id)
- is_disputed (boolean, default false)
```

## Component Structure

### **OrderChat.jsx**
Main chat component with:
- Real-time message subscription
- Message input and sending
- Packer info display
- Arbitration button logic
- System message rendering

### **Exchange.jsx**
Updated dashboards:
- **ClientDashboard**: Chat buttons in bids list and booked orders
- **PackerDashboard**: "My Active Orders" tab with chat access
- **ManagerDashboard**: New dashboard for viewing all orders and resolving disputes

## Usage Guide

### For Clients

#### **Pre-booking (Status: 'searching')**
1. Create an order
2. Wait for Packers to place bids
3. Click "View Bids" to see all offers
4. Click "Chat" button on any bid to start a conversation with that Packer
5. In the chat, you can:
   - Discuss details with the Packer
   - Ask questions
   - Click "Hire This Packer" in the chat header to accept the bid

#### **After Booking (Status: 'booked')**
1. Order card shows "Order Booked & In Progress"
2. Click "Open Chat" to communicate with your hired Packer
3. If issues arise:
   - Click "Call Arbitration" button (appears after deadline or if needed)
   - Manager will be notified and can help resolve

### For Packers

#### **Marketplace**
1. Browse available orders
2. Click "Откликнуться (Place Bid)" to submit your offer
3. After bidding, you can't chat yet (wait for Client to initiate)

#### **Active Orders**
1. Click "My Active Orders" tab
2. See all orders you've been hired for
3. Click "Open Chat with Client" to communicate
4. If dispute is called:
   - Continue communicating via chat
   - Manager will intervene

### For Managers/Admins

#### **Dashboard Access**
1. Managers automatically see the Manager Dashboard
2. Two tabs available:
   - **Disputed Orders**: Shows only orders with `is_disputed = true`
   - **All Orders**: Shows all recent orders (limit 50)

#### **Viewing Chats**
1. Click "View Chat" on any order
2. See full message history
3. Send messages to help resolve issues
4. Both Client and Packer see your messages

#### **Resolving Disputes**
1. Review chat history
2. Communicate with both parties
3. Make a decision
4. Click "Resolve Dispute" button
5. System message sent: "Dispute resolved by manager. ✅"
6. Order removed from "Disputed Orders" tab

## Real-time Features

### Supabase Channels
The system uses Supabase Realtime to subscribe to message inserts:

```javascript
supabase
  .channel(`messages:order_${orderId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'messages'
  }, callback)
  .subscribe()
```

### Performance Optimizations
- Indexed database queries
- Efficient filtering by order and packer
- Automatic cleanup of subscriptions on unmount
- Debounced scroll to bottom

## Security

### Row Level Security (RLS) Policies

#### **Read Access**
Users can read messages if:
- They are the client of the order
- They are the sender of the message
- They are the relevant packer (pre-booking)
- They are the accepted packer (post-booking)
- They are a manager or admin

#### **Write Access**
Users can send messages if:
- They are the client of the order
- They are the relevant packer
- They are the accepted packer
- They are a manager or admin

## Troubleshooting

### Messages Not Appearing
1. Check browser console for errors
2. Verify Supabase URL and API key in `.env`
3. Ensure RLS policies are properly set up
4. Check that user is authenticated

### Chat Not Opening
1. Verify `order.accepted_packer_id` is set for booked orders
2. For searching status, ensure a packer is selected
3. Check that OrderChat component receives all required props

### Arbitration Button Not Showing
1. Verify order status is 'booked' or 'completed'
2. Check that `is_disputed` is false
3. Ensure current date is past deadline (if applicable)

### Real-time Updates Not Working
1. Check Supabase Realtime is enabled in project settings
2. Verify channel subscription is active
3. Check browser console for WebSocket errors
4. Ensure `messages` table has proper triggers

## Environment Variables

Make sure your `.env` file contains:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Testing Checklist

### Client Flow
- [ ] Create order
- [ ] View bids from multiple packers
- [ ] Open chat with different packers (separate rooms)
- [ ] Hire packer from chat header
- [ ] Chat with hired packer after booking
- [ ] Call arbitration if needed

### Packer Flow
- [ ] Place bid on order
- [ ] Wait for client chat (cannot initiate)
- [ ] Respond to client messages
- [ ] View active orders tab
- [ ] Chat with clients of accepted bids

### Manager Flow
- [ ] View disputed orders tab
- [ ] View all orders tab
- [ ] Open any order's chat
- [ ] Send messages to parties
- [ ] Resolve disputes

### Real-time Tests
- [ ] Send message in one browser, see in another instantly
- [ ] System messages appear for all parties
- [ ] Arbitration calls update UI immediately
- [ ] Hiring packer updates order status in real-time

## Next Steps & Enhancements

Consider implementing:
1. **File uploads** in chat (images, documents)
2. **Read receipts** to show when messages are seen
3. **Typing indicators** to show when someone is typing
4. **Push notifications** for new messages
5. **Message search** within chat history
6. **Chat archival** for completed orders
7. **Automated dispute escalation** after timeout
8. **Rating system** post-completion
9. **Export chat history** as PDF
10. **Emoji reactions** to messages

## Support

If you encounter issues:
1. Check the browser console for errors
2. Review Supabase logs in the Dashboard
3. Verify all environment variables are set
4. Ensure database migrations completed successfully
5. Test with different user roles

## Architecture Decisions

### Why Separate Chat Rooms During 'searching'?
- Allows clients to negotiate with multiple packers simultaneously
- Prevents information leakage between packers
- Maintains privacy and competitive bidding

### Why Use `relevant_packer_id`?
- Enables filtering messages by packer during pre-booking phase
- Maintains chat history after hiring
- Allows managers to see all conversations

### Why Store `accepted_packer_id` on Order?
- Simplifies queries for active packer orders
- Enables efficient chat filtering post-booking
- Supports order history and analytics

## Conclusion

Your Real-time Chat & Arbitration System is now fully implemented! This system provides:
- ✅ Context-aware chat rooms
- ✅ Real-time messaging
- ✅ In-chat hiring functionality
- ✅ Dispute resolution with manager oversight
- ✅ Modern, responsive UI
- ✅ Secure, role-based access control

The system is production-ready and scalable for your marketplace platform.





