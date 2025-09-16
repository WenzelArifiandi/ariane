#!/bin/bash

echo "🔍 Comprehensive Deployment Status & Troubleshooting"
echo "=================================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper function for status indicators
status_check() {
    local url="$1"
    local name="$2"
    local expected_code="$3"
    
    echo -n "🔍 Checking $name... "
    local status=$(curl -s -o /dev/null -w "%{http_code}" "$url" || echo "000")
    
    if [ "$status" = "$expected_code" ]; then
        echo -e "${GREEN}✅ OK (HTTP $status)${NC}"
        return 0
    else
        echo -e "${RED}❌ Issue (HTTP $status)${NC}"
        return 1
    fi
}

# Get current commit info
CURRENT_COMMIT=$(git rev-parse HEAD)
CURRENT_SHORT=$(git rev-parse --short HEAD)
echo -e "${BLUE}📍 Local Repository${NC}"
echo "   Commit: $CURRENT_SHORT ($CURRENT_COMMIT)"
echo "   Branch: $(git branch --show-current)"
echo ""

# Check service endpoints
echo -e "${BLUE}🌐 Service Health Checks${NC}"
HEALTH_OK=0
CONSOLE_OK=0

if status_check "https://auth.wenzelarifiandi.com/.well-known/openid-configuration" "OIDC Configuration" "200"; then
    HEALTH_OK=1
fi

if status_check "https://auth.wenzelarifiandi.com/ui/console" "Management Console" "200"; then
    CONSOLE_OK=1
fi

if status_check "https://auth.wenzelarifiandi.com/debug/healthz" "Health Endpoint" "200"; then
    echo "   Health endpoint is accessible"
fi

echo ""

# Overall status
echo -e "${BLUE}📊 Overall Status${NC}"
if [ "$HEALTH_OK" = "1" ] && [ "$CONSOLE_OK" = "1" ]; then
    echo -e "   ${GREEN}✅ All services are healthy${NC}"
    OVERALL_STATUS="healthy"
elif [ "$HEALTH_OK" = "1" ]; then
    echo -e "   ${YELLOW}⚠️ Core service OK, console may be starting${NC}"
    OVERALL_STATUS="partial"
else
    echo -e "   ${RED}❌ Services are not responding${NC}"
    OVERALL_STATUS="down"
fi
echo ""

# Deployment timeline
echo -e "${BLUE}📜 Recent Deployment History${NC}"
echo "   Last 5 commits:"
git log --oneline --graph --decorate -5 | sed 's/^/   /'
echo ""

# Timestamp
echo -e "${BLUE}🕐 Check Information${NC}"
echo "   Performed at: $(date -Iseconds)"
echo "   Local timezone: $(date +%Z)"
echo ""

# Troubleshooting guidance based on status
echo -e "${BLUE}💡 Troubleshooting Guidance${NC}"

if [ "$OVERALL_STATUS" = "healthy" ]; then
    echo "   ✅ Everything looks good!"
    echo "   If you're still seeing issues, try:"
    echo "   • Clear browser cache and cookies for auth.wenzelarifiandi.com"
    echo "   • Try an incognito/private browsing window"
    echo "   • Check browser console for JavaScript errors"
    
elif [ "$OVERALL_STATUS" = "partial" ]; then
    echo "   ⚠️ Services are starting up or partially available"
    echo "   This is normal after a deployment. Try:"
    echo "   • Wait 2-3 minutes for all services to fully start"
    echo "   • Refresh the page"
    echo "   • Check again in a few minutes"
    
else
    echo "   ❌ Services appear to be down. Possible causes:"
    echo ""
    echo "   🔍 Deployment Issues:"
    echo "   • Check if the latest deployment workflow completed successfully"
    echo "   • Verify Caddy configuration is valid"
    echo "   • Ensure Docker containers are running on the server"
    echo ""
    echo "   🔧 Server Issues:"
    echo "   • Oracle Cloud instance might be down or unreachable"
    echo "   • Docker services might have failed to start"
    echo "   • Network connectivity issues"
    echo ""
    echo "   🛠️ Configuration Issues:"
    echo "   • Caddy configuration syntax errors"
    echo "   • SSL certificate problems"
    echo "   • Port conflicts or firewall issues"
fi

echo ""
echo -e "${BLUE}🚀 Quick Actions${NC}"
echo "   Check deployment status:"
echo "   • View GitHub Actions: https://github.com/WenzelArifiandi/ariane/actions"
echo "   • Manual deployment: gh workflow run 'Deploy Zitadel to Oracle Cloud' --field force=true"
echo ""
echo "   For immediate access (requires SSH):"
echo "   • Check server: ssh ubuntu@auth.wenzelarifiandi.com 'cd zitadel && docker-compose ps'"
echo "   • View logs: ssh ubuntu@auth.wenzelarifiandi.com 'cd zitadel && docker-compose logs --tail=50'"
echo "   • Restart services: ssh ubuntu@auth.wenzelarifiandi.com 'cd zitadel && docker-compose restart'"
echo ""

# Cache-busting suggestions
if [ "$OVERALL_STATUS" = "healthy" ]; then
    echo -e "${BLUE}🧹 Browser Cache Troubleshooting${NC}"
    echo "   If you're still seeing old error messages:"
    echo ""
    echo "   Chrome/Edge:"
    echo "   • Open DevTools (F12)"
    echo "   • Right-click refresh button → 'Empty Cache and Hard Reload'"
    echo "   • Or: Ctrl+Shift+R (Windows) / Cmd+Shift+R (Mac)"
    echo ""
    echo "   Firefox:"
    echo "   • Ctrl+Shift+R (Windows) / Cmd+Shift+R (Mac)"
    echo "   • Or: Hold Shift while clicking refresh"
    echo ""
    echo "   Safari:"
    echo "   • Cmd+Option+R"
    echo "   • Or: Develop → Empty Caches (if Developer menu enabled)"
    echo ""
    echo "   Alternative: Try an incognito/private window"
    echo ""
fi

# Version checking information
echo -e "${BLUE}📋 Version Information${NC}"
echo "   To check what's deployed on the server:"
echo "   ssh ubuntu@auth.wenzelarifiandi.com 'cat /home/ubuntu/zitadel/.deployment_state'"
echo ""
echo "   To compare with current commit:"
echo "   git rev-parse HEAD"
echo ""
echo "   Should match: $CURRENT_COMMIT"
echo ""

exit 0