#!/bin/bash

echo "🔍 Deployment Version Check"
echo "==========================="
echo ""

# Get current local commit
CURRENT_COMMIT=$(git rev-parse HEAD)
CURRENT_SHORT=$(git rev-parse --short HEAD)
echo "📍 Local commit: $CURRENT_SHORT ($CURRENT_COMMIT)"
echo ""

# Check if service is reachable
echo "🌐 Checking service availability..."
HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://auth.wenzelarifiandi.com/.well-known/openid-configuration" || echo "000")

if [ "$HEALTH_STATUS" = "200" ]; then
    echo "✅ Zitadel service is healthy (HTTP $HEALTH_STATUS)"
else
    echo "❌ Zitadel service issue (HTTP $HEALTH_STATUS)"
fi
echo ""

# Check console access
echo "🖥️ Checking console access..."
CONSOLE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://auth.wenzelarifiandi.com/ui/console" || echo "000")

if [ "$CONSOLE_STATUS" = "200" ]; then
    echo "✅ Console is accessible (HTTP $CONSOLE_STATUS)"
else
    echo "⚠️ Console access issue (HTTP $CONSOLE_STATUS)"
fi
echo ""

# Get current time for reference
echo "🕐 Check performed at: $(date -Iseconds)"
echo ""

# Show recent commits for context
echo "📜 Recent commits:"
git log --oneline -5
echo ""

# Check if we can determine deployment state (would need SSH access)
echo "💡 To check deployed version on server, you would need to run:"
echo "   ssh ubuntu@auth.wenzelarifiandi.com 'cat /home/ubuntu/zitadel/.deployment_state'"
echo "   (This requires SSH access to the server)"