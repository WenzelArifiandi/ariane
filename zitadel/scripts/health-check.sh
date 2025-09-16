#!/bin/bash

# Zitadel Health Check Script
# Comprehensive health monitoring for production deployment

set -e

DOMAIN="${ZITADEL_EXTERNALDOMAIN:-auth.wenzelarifiandi.com}"
MAX_ATTEMPTS="${MAX_ATTEMPTS:-10}"
TIMEOUT="${TIMEOUT:-10}"

echo "🏥 Zitadel Health Check - $(date)"
echo "================================"
echo "Domain: $DOMAIN"
echo "Max attempts: $MAX_ATTEMPTS"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Health check function
check_endpoint() {
    local url=$1
    local description=$2
    local expected_code=${3:-200}

    echo -n "🔍 $description... "

    response=$(curl -s -o /dev/null -w "%{http_code}" --max-time $TIMEOUT "$url" 2>/dev/null || echo "000")

    if [ "$response" = "$expected_code" ]; then
        echo -e "${GREEN}✅ OK (HTTP $response)${NC}"
        return 0
    else
        echo -e "${RED}❌ FAIL (HTTP $response)${NC}"
        return 1
    fi
}

# Check Docker services
check_docker_services() {
    echo "🐳 Docker Services Status:"
    echo "------------------------"

    if command -v docker-compose &> /dev/null; then
        docker-compose ps --format table
        echo ""

        # Check if all services are up
        unhealthy=$(docker-compose ps --format json | jq -r 'select(.State != "Up") | .Name' 2>/dev/null || true)
        if [ -n "$unhealthy" ]; then
            echo -e "${RED}❌ Unhealthy services detected:${NC}"
            echo "$unhealthy"
            return 1
        else
            echo -e "${GREEN}✅ All Docker services are running${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️ docker-compose not found${NC}"
        return 1
    fi
}

# Main health checks
main() {
    local exit_code=0

    # Docker services check
    if ! check_docker_services; then
        exit_code=1
    fi

    echo ""
    echo "🌐 Endpoint Health Checks:"
    echo "-------------------------"

    # Core endpoints
    if ! check_endpoint "https://$DOMAIN/.well-known/openid-configuration" "OIDC Discovery"; then
        exit_code=1
    fi

    if ! check_endpoint "https://$DOMAIN/ui/console" "Console UI"; then
        exit_code=1
    fi

    if ! check_endpoint "https://$DOMAIN/oauth/v2/keys" "OAuth Keys"; then
        exit_code=1
    fi

    if ! check_endpoint "https://$DOMAIN/debug/healthz" "Health Check Endpoint"; then
        exit_code=1
    fi

    # Additional checks
    echo ""
    echo "🔍 Detailed Checks:"
    echo "------------------"

    # Check OIDC discovery content
    echo -n "📋 OIDC Discovery Content... "
    discovery=$(curl -s --max-time $TIMEOUT "https://$DOMAIN/.well-known/openid-configuration" 2>/dev/null || echo "")
    if echo "$discovery" | jq -e '.issuer' >/dev/null 2>&1; then
        issuer=$(echo "$discovery" | jq -r '.issuer')
        echo -e "${GREEN}✅ OK (Issuer: $issuer)${NC}"
    else
        echo -e "${RED}❌ Invalid OIDC discovery response${NC}"
        exit_code=1
    fi

    # Check SSL certificate
    echo -n "🔒 SSL Certificate... "
    if openssl s_client -connect "$DOMAIN:443" -servername "$DOMAIN" </dev/null 2>/dev/null | openssl x509 -noout -dates 2>/dev/null; then
        expiry=$(openssl s_client -connect "$DOMAIN:443" -servername "$DOMAIN" </dev/null 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)
        echo -e "${GREEN}✅ Valid (Expires: $expiry)${NC}"
    else
        echo -e "${RED}❌ SSL certificate issues${NC}"
        exit_code=1
    fi

    # Performance check
    echo -n "⚡ Response Time... "
    start_time=$(date +%s%N)
    curl -s --max-time $TIMEOUT "https://$DOMAIN/.well-known/openid-configuration" >/dev/null 2>&1
    end_time=$(date +%s%N)
    response_time=$(( (end_time - start_time) / 1000000 )) # Convert to milliseconds

    if [ $response_time -lt 1000 ]; then
        echo -e "${GREEN}✅ Fast (${response_time}ms)${NC}"
    elif [ $response_time -lt 3000 ]; then
        echo -e "${YELLOW}⚠️ Slow (${response_time}ms)${NC}"
    else
        echo -e "${RED}❌ Very slow (${response_time}ms)${NC}"
        exit_code=1
    fi

    echo ""
    echo "📊 Summary:"
    echo "----------"
    if [ $exit_code -eq 0 ]; then
        echo -e "${GREEN}✅ All health checks passed!${NC}"
        echo "🎉 Zitadel is healthy and ready to serve requests"
    else
        echo -e "${RED}❌ Some health checks failed!${NC}"
        echo "🔍 Check the logs above for details"
        echo "💡 Common fixes:"
        echo "   - Restart services: docker-compose restart"
        echo "   - Check logs: docker-compose logs"
        echo "   - Verify configuration files"
    fi

    exit $exit_code
}

# Run with retry logic if specified
if [ "$MAX_ATTEMPTS" -gt 1 ]; then
    for attempt in $(seq 1 $MAX_ATTEMPTS); do
        echo "🔄 Health check attempt $attempt/$MAX_ATTEMPTS"

        if main; then
            echo -e "${GREEN}✅ Health check successful on attempt $attempt${NC}"
            exit 0
        fi

        if [ $attempt -lt $MAX_ATTEMPTS ]; then
            echo -e "${YELLOW}⏳ Waiting 10 seconds before retry...${NC}"
            sleep 10
        fi
    done

    echo -e "${RED}💥 Health check failed after $MAX_ATTEMPTS attempts${NC}"
    exit 1
else
    main
fi