# Exchange.jsx Redesign Plan

## Current Issues
- Table list looks empty with few orders (1-2)
- Chat functionality buried
- Items table takes too much space (15+ columns)
- Not workflow-focused

## New Design: "Dashboard Cards → Order Focus View"

### View 1: Dashboard (Default)
**Grid of Cards**
- "Create New Order" card (dashed border, prominent)
- Order cards with:
  - Title + Status badge
  - Brief stats (items count, budget, deadline)
  - Action button ("Open Order" / "View Bids")

### View 2: Order Focus View
**When clicking a card:**
- Breadcrumb "< Back to Dashboard"
- Order header with title, status, arbitration button
- **Chat Component** - prominent, always visible
- **Items Table** - collapsed by default, opens in modal
- **Bids Section** - for orders in 'searching' status

### Components to Create
1. `OrderCard` - Card component for dashboard
2. `CreateOrderCard` - Special card for new orders
3. `OrderFocusView` - Detail view with chat
4. `ItemsTableModal` - Modal for wide items table

### State Management
- `focusedOrder` - Currently selected order (null = dashboard)
- `showItemsModal` - Toggle items table modal
- Keep existing states for chat, bids, etc.





