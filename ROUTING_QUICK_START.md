# 🚀 Quick Start - Routing API

## What Was Fixed ✅

The routing API was not calculating routes because:
1. **Graph loading bug** - The global graph variable wasn't being properly assigned in `riskscoreservice.py`
2. **Fixed in**: Updated the graph loading to use a temporary variable and explicitly assign to global

## Starting the Backend

```bash
cd backend
uvicorn main:app --reload
```

Expected output:
```
--- Loading Precomputed Data ---
Loaded risk data: 240000 records.
Loaded Safe Graph: 68408 nodes, 173601 edges.
All core data and systems are successfully initialized.
INFO:     Uvicorn running on http://127.0.0.1:8000
```

## Verify It Works

### Option 1: Run Test Script
```bash
python test_routing_api.py
```

### Option 2: Check Health
```bash
curl http://localhost:8000/route/health
```

### Option 3: Calculate a Route
```bash
curl -X POST http://localhost:8000/route/safe \
  -H "Content-Type: application/json" \
  -d '{
    "start_lat": 40.7128,
    "start_lon": -74.0060,
    "end_lat": 40.7580,
    "end_lon": -73.9855
  }'
```

## Using in Frontend

The frontend is already integrated! The `Home.tsx` page has:

1. **Start Point** - Click map or enter coordinates
2. **End Point** - Click map or enter coordinates  
3. **Mode Selector** - Choose: safe, balanced, stealth, escort
4. **Calculate Route** - Button to request route

The route will show:
- 🗺️ Path on the map
- 📏 Distance in km
- 🛡️ Safety mode used

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/route/health` | GET | Check service status |
| `/route/safe` | POST | Calculate safe route |
| `/route/balanced` | POST | Calculate balanced route |
| `/route/stealth` | POST | Calculate stealth route |
| `/route/escort` | POST | Calculate escort route |

## Request Format

```json
{
  "start_lat": 40.7128,      // Starting latitude (-90 to 90)
  "start_lon": -74.0060,     // Starting longitude (-180 to 180)
  "end_lat": 40.7580,        // Ending latitude
  "end_lon": -73.9855        // Ending longitude
}
```

## Response Format

```json
{
  "route_coords": [
    {"lat": 40.7128, "lon": -74.0060},
    {"lat": 40.7145, "lon": -74.0058},
    ...
  ],
  "distance_approx_km": 3.45,
  "mode_used": "safe"
}
```

## Routing Modes Explained

| Mode | Use Case | Behavior |
|------|----------|----------|
| **safe** | Normal travel | Avoids dangerous areas |
| **balanced** | Time matters | Balances speed and safety |
| **stealth** | Low visibility | Avoids busy roads |
| **escort** | Group travel | Safe routes for groups |

## Files Modified

- ✅ `backend/services/riskscoreservice.py` - Fixed graph loading
- ✅ `backend/routes/routingservice.py` - Enhanced error handling
- ✅ `backend/test_routing_api.py` - NEW: Comprehensive test suite
- ✅ `ROUTING_API_GUIDE.md` - NEW: Complete documentation

## Debugging

If routes still aren't calculating:

1. **Check backend logs** - Look for error messages
2. **Verify graph loaded** - Check health endpoint
3. **Try different coordinates** - Must be within map area
4. **Check console** - Browser console for frontend errors

See `ROUTING_API_GUIDE.md` for detailed troubleshooting.

---

**Ready to use!** 🎉 The routing API is fully functional and tested.
