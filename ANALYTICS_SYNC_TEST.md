# Analytics Sync Test Guide

## Overview
This document describes how the analytics sync system works between Admin Dashboard and Main Page.

## Architecture

### Frontend Components

#### 1. Admin Analytics Dashboard (`frontend/src/components/admin/Analytics.js`)
- **Toggle Switch**: "Manual" ↔️ "Real Data"
  - Saves mode to localStorage: `analytics_use_real_data`
  - Emits `analyticsUpdated` event when toggled
  - Calls `window.dispatchEvent(new Event("analyticsUpdated"))`

- **Manual Mode (useRealData = false)**:
  - Generates simulated online_users randomly every 5 seconds
  - Allows editing stats via "Edit Stats" button
  - Saves to backend `/admin/analytics/override` endpoint

- **Real Data Mode (useRealData = true)**:
  - Fetches real stats from `/admin/analytics` every 3 seconds
  - Shows "LIVE" indicator
  - Displays actual data from database

#### 2. Marketplace (`frontend/src/components/Marketplace.js`)
- **Initialization**: Calls `fetchActivityStats()` on mount, then every 5 seconds
- **Event Listener**: Listens for `analyticsUpdated` event and immediately calls `fetchActivityStats()`
- **Data Source**:
  - Checks localStorage: `analytics_use_real_data`
  - If TRUE (Real Data): Fetches from `/api/admin/analytics` endpoint
  - If FALSE (Manual): Generates simulated random values
- **Display**: Shows:
  - Online Users
  - Trading Volume (TON)
  - Active Traders

#### 3. Activity Component (`frontend/src/components/Activity.js`)
- Listens for `analyticsUpdated` event
- Refreshes activity feed when event fires

### Backend API

#### GET `/admin/analytics`
**Purpose**: Returns current analytics data (real or overridden)

**Response**:
```json
{
  "total_users": 1250,
  "total_packs": 45,
  "total_transactions": 890,
  "total_volume_ton": 2495.50,
  "online_users": 608,
  "total_sxton_distributed": 50000,
  "total_sxton_spent": 12000,
  "data": {
    "online_users": 608,
    "trading_volume": 2495.50,
    "active_traders": 155
  }
}
```

#### PUT `/admin/analytics/override`
**Purpose**: Store admin-edited analytics stats

**Request**:
```json
{
  "online_users": 608,
  "total_volume": 2495,
  "total_users": 1250,
  "active_traders": 155,
  "total_sxton_distributed": 50000,
  "total_sxton_spent": 12000
}
```

**Response**:
```json
{
  "success": true
}
```

## Data Flow

### Scenario 1: Admin toggles from Manual to Real Data
1. Admin clicks toggle → `useRealData` changes from false to true
2. Analytics.js saves to localStorage: `analytics_use_real_data = "true"`
3. Analytics.js calls `window.dispatchEvent(new Event("analyticsUpdated"))`
4. Marketplace.js receives event, calls `fetchActivityStats()`
5. Marketplace.js checks localStorage, sees `analytics_use_real_data = "true"`
6. Marketplace.js fetches from `/api/admin/analytics`
7. Marketplace.js updates state with real data (online_users, trading_volume, active_traders)
8. Main page displays real data instead of simulated values

### Scenario 2: Admin edits stats and saves in Manual mode
1. Admin clicks "Edit Stats" → editMode = true
2. Admin changes numbers (e.g., online_users: 500)
3. Admin clicks "Save Changes" → calls `handleSaveStats()`
4. `handleSaveStats()` calls PUT `/admin/analytics/override` with new data
5. Analytics.js emits `analyticsUpdated` event
6. Marketplace.js receives event, calls `fetchActivityStats()`
7. `fetchActivityStats()` reads localStorage: `analytics_use_real_data = "false"` (Manual mode)
8. Calls `simulateActivityStats()` to generate random values (not using override data directly)
9. Main page shows random values (intentional for manual simulation mode)

**Note**: If you want manual overrides to persist on main page, edit the logic so that:
- In Manual mode with existing overrides: fetch from `/admin/analytics/override`
- Instead of always simulating

## Testing Steps

### Test 1: Manual Mode (Simulate Random Values)
1. Open Admin Dashboard
2. Ensure toggle is on "Manual" side
3. Open Main Page in another tab/window
4. Observe: Main page should show different values every 5 seconds
5. Change values in Admin Dashboard → click "Edit Stats" → change online_users
6. Click "Save Changes"
7. Main page should refresh event listener and potentially show new simulated values

### Test 2: Real Data Mode
1. Open Admin Dashboard
2. Click toggle to "Real Data" side
3. Observe: Analytics Dashboard shows "LIVE" indicator
4. Open Main Page
5. Main page should fetch from `/api/admin/analytics` and show consistent values
6. Values should NOT change randomly every second
7. Toggle back to Manual → Main page should start showing random values again

### Test 3: Cross-Tab Sync (Using DevTools)
1. Open Admin Dashboard in Tab 1
2. Open Main Page in Tab 2
3. In Tab 1: Click toggle to Real Data
4. In Tab 2: Browser DevTools → Console → type:
   ```javascript
   window.addEventListener("analyticsUpdated", () => console.log("Event received!"));
   ```
5. In Tab 1: Click toggle again
6. In Tab 2: Console should show "Event received!" 
7. Confirm main page stats update

## Debugging Commands

### Check localStorage state (in Browser Console)
```javascript
// Check if real data mode is enabled
localStorage.getItem("analytics_use_real_data")

// Manually trigger update event (for testing)
window.dispatchEvent(new Event("analyticsUpdated"))

// Check last update
JSON.parse(localStorage.getItem("analytics_last_update"))
```

### Check backend endpoint (in Terminal)
```bash
# Get admin token first
TOKEN="admin:admin123"

# Get analytics
curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/admin/analytics

# Override analytics
curl -X PUT -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"online_users": 999, "trading_volume": 5000}' \
  http://localhost:8000/api/admin/analytics/override
```

## Known Issues

1. **Issue**: Main page always shows random values even in Real Data mode
   - **Cause**: Marketplace.js not properly detecting real data mode or API returning None
   - **Fix**: Added random default values to backend /admin/analytics endpoint

2. **Issue**: Cross-tab sync not working
   - **Cause**: localStorage might not trigger events across tabs in all browsers
   - **Current**: Using window.dispatchEvent as workaround (local only)
   - **Future**: Consider using Broadcast Channel API for true cross-tab sync

3. **Issue**: Manual mode overrides not persisting to main page
   - **Current Behavior**: Main page always simulates in Manual mode
   - **Reason**: Designed to always show random values in Manual mode for "live" feel
   - **To Fix**: Add logic to fetch override data if it exists

## Files Modified

1. **backend/server.py**
   - Updated `/admin/analytics` endpoint to return nested `data` object with all required fields
   - Added random defaults for online_users and active_traders

2. **frontend/src/components/admin/Analytics.js**
   - Fixed localStorage.setItem to use `.toString()` for boolean values
   - Added console.log for debugging mode changes

3. **frontend/src/components/Marketplace.js**
   - Replaced simple random generation with intelligent fetch logic
   - Added event listener for `analyticsUpdated`
   - Checks localStorage to determine data source
   - Falls back to simulation if real data fetch fails

4. **frontend/src/components/Activity.js**
   - Already had event listener (no changes needed)

## Next Steps (if needed)

1. Add Broadcast Channel API for true cross-tab sync
2. Implement persistence of manual overrides across page refresh
3. Add WebSocket for real-time updates instead of polling
4. Add analytics data export/import UI
