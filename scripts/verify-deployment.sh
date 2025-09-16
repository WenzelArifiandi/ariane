#!/bin/bash
# Deployment Verification Script
# Compares Oracle server deployment with local repository

set -e

echo "🔍 Deployment Verification"
echo "=========================="
echo ""

# Get local latest commit
LOCAL_COMMIT=$(git rev-parse HEAD)
LOCAL_SHORT=$(git rev-parse --short HEAD)

echo "📁 Local Repository:"
echo "   Latest commit: $LOCAL_SHORT ($LOCAL_COMMIT)"
echo "   Latest message: $(git log -1 --pretty=format:'%s')"
echo ""

# Get deployed commit from Oracle server
echo "🌐 Oracle Server (auth.wenzelarifiandi.com):"

if ssh -i ~/.ssh/oracle_key_correct ubuntu@auth.wenzelarifiandi.com 'test -f zitadel/.deployment_state' 2>/dev/null; then
    DEPLOYED_COMMIT=$(ssh -i ~/.ssh/oracle_key_correct ubuntu@auth.wenzelarifiandi.com 'cat zitadel/.deployment_state' 2>/dev/null)
    DEPLOYED_SHORT=$(echo $DEPLOYED_COMMIT | cut -c1-7)

    echo "   Deployed commit: $DEPLOYED_SHORT ($DEPLOYED_COMMIT)"

    # Get commit message for deployed version
    if git cat-file -e $DEPLOYED_COMMIT 2>/dev/null; then
        DEPLOYED_MSG=$(git log -1 --pretty=format:'%s' $DEPLOYED_COMMIT 2>/dev/null || echo "Commit not found locally")
        echo "   Deployed message: $DEPLOYED_MSG"
    else
        echo "   Deployed message: (commit not found in local repo)"
    fi

    echo ""

    # Compare versions
    if [ "$LOCAL_COMMIT" = "$DEPLOYED_COMMIT" ]; then
        echo "✅ STATUS: Oracle deployment is UP TO DATE"
    else
        echo "⚠️  STATUS: Oracle deployment is OUT OF DATE"

        # Show what commits are missing
        if git cat-file -e $DEPLOYED_COMMIT 2>/dev/null; then
            echo ""
            echo "📋 Missing commits on Oracle server:"
            git log --oneline $DEPLOYED_COMMIT..$LOCAL_COMMIT
        fi

        echo ""
        echo "💡 To update Oracle server:"
        echo "   1. Push any pending changes to GitHub"
        echo "   2. Deployment will trigger automatically"
        echo "   3. Or manually trigger: https://github.com/WenzelArifiandi/ariane/actions/workflows/deploy-zitadel.yml"
    fi
else
    echo "   ❌ Cannot determine deployed version (.deployment_state not found)"
fi

echo ""

# Check if services are running
echo "🔧 Service Status:"
if ssh -i ~/.ssh/oracle_key_correct ubuntu@auth.wenzelarifiandi.com 'cd zitadel && docker-compose ps -q' >/dev/null 2>&1; then
    RUNNING_SERVICES=$(ssh -i ~/.ssh/oracle_key_correct ubuntu@auth.wenzelarifiandi.com 'cd zitadel && docker-compose ps --services --filter status=running' 2>/dev/null | wc -l)
    TOTAL_SERVICES=$(ssh -i ~/.ssh/oracle_key_correct ubuntu@auth.wenzelarifiandi.com 'cd zitadel && docker-compose ps --services' 2>/dev/null | wc -l)
    echo "   Running services: $RUNNING_SERVICES/$TOTAL_SERVICES"

    if [ "$RUNNING_SERVICES" -eq "$TOTAL_SERVICES" ]; then
        echo "   ✅ All services are running"
    else
        echo "   ⚠️  Some services are not running"
    fi
else
    echo "   ❌ Cannot check service status"
fi

echo ""
echo "🌍 Access Points:"
echo "   Console: https://auth.wenzelarifiandi.com/ui/console"
echo "   Health:  https://auth.wenzelarifiandi.com/debug/healthz"