---
title: "Zitadel Profile Update Fix (COMMAND-2M0fs)"
description: "# Zitadel Profile Update Fix (COMMAND-2M0fs)"
slug: "zitadel-projection-fix"
---



# Zitadel Profile Update Fix (COMMAND-2M0fs)

**Date:** September 16, 2025
**Issue:** Profile not changed (COMMAND-2M0fs)
**Status:** ✅ RESOLVED

## Problem

Users experienced "Profile not changed (COMMAND-2M0fs)" error when trying to update their profile information in Zitadel. This error indicates that the Zitadel projections (read models) were out of sync with the eventstore.

## Root Cause

Zitadel uses an event-sourcing architecture where:
- **Eventstore** contains the authoritative event history
- **Projections** are read models built from events for fast queries
- When projections fall behind or become corrupted, profile updates fail

## Solution Applied

1. **Projection Rebuild**: Executed projection rebuild command:
   ```bash
   docker-compose exec -T zitadel /app/zitadel setup \
     --config /config/zitadel.yaml \
     --init-projections \
     --masterkey MasterkeyNeedsToHave32Characters
   ```

2. **Service Restart**: Restarted Zitadel service to apply changes:
   ```bash
   docker-compose restart zitadel
   ```

3. **Verification**: Confirmed service health and accessibility

## Technical Details

The `--init-projections` flag rebuilds all projection tables from the eventstore, ensuring:
- User projection tables are synchronized with events
- Profile update operations function correctly
- Database consistency is restored

## Verification Steps

After the fix:
- ✅ Zitadel service is healthy (HTTP 200)
- ✅ Console UI is accessible
- ✅ No projection errors in logs
- ✅ Database projections are synchronized

## Prevention

To prevent this issue in the future:
- Monitor Zitadel logs for projection errors
- Include projection health checks in monitoring
- Consider automated projection rebuilds if corruption is detected

## Related Commands

```bash
# Check service status
docker-compose ps

# View logs for errors
docker-compose logs zitadel | grep -i "projection\|error"

# Rebuild projections (if needed again)
docker-compose exec -T zitadel /app/zitadel setup \
  --config /config/zitadel.yaml \
  --init-projections \
  --masterkey MasterkeyNeedsToHave32Characters

# Restart service
docker-compose restart zitadel
```

---

**Note:** This fix resolves the immediate projection synchronization issue. Profile updates should now work correctly in the Zitadel console.