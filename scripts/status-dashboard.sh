#!/bin/bash

# Status Dashboard Generator
# Generates additional status information and metrics for the project

set -e

echo "📊 Ariane Project Status Dashboard"
echo "=================================="
echo "Generated: $(date -Iseconds)"
echo ""

# GitHub Actions Status
echo "🚀 GitHub Actions Status:"
echo "-------------------------"

# Check if we can access GitHub API
if command -v gh &> /dev/null; then
    echo "📋 Recent workflow runs:"
    gh run list --limit 5 --json status,name,conclusion,createdAt --template '{{range .}}{{.name}}: {{.status}} ({{.conclusion}}) - {{timeago .createdAt}}{{"\n"}}{{end}}'
    echo ""

    echo "🔍 Security workflow status:"
    gh run list --workflow=security-scanning.yml --limit 3 --json status,conclusion,createdAt --template '{{range .}}Security Scan: {{.status}} ({{.conclusion}}) - {{timeago .createdAt}}{{"\n"}}{{end}}'
    echo ""
else
    echo "⚠️ GitHub CLI not installed. Install with: brew install gh"
    echo ""
fi

# Service Health Checks
echo "🏥 Service Health Checks:"
echo "------------------------"

# Check Zitadel OIDC endpoint
echo -n "🔒 Zitadel OIDC Discovery: "
if curl -s --max-time 10 https://auth.wenzelarifiandi.com/.well-known/openid-configuration >/dev/null 2>&1; then
    echo "✅ HEALTHY"
else
    echo "❌ UNHEALTHY"
fi

# Check Zitadel Console
echo -n "🖥️ Zitadel Console: "
if curl -s --max-time 10 https://auth.wenzelarifiandi.com/ui/console >/dev/null 2>&1; then
    echo "✅ HEALTHY"
else
    echo "❌ UNHEALTHY"
fi

# Check response time
echo -n "⚡ Zitadel Response Time: "
response_time=$(curl -s -o /dev/null -w "%{time_total}" --max-time 10 https://auth.wenzelarifiandi.com/.well-known/openid-configuration 2>/dev/null || echo "timeout")
if [ "$response_time" != "timeout" ]; then
    response_ms=$(echo "$response_time * 1000" | bc 2>/dev/null || echo "N/A")
    echo "${response_ms}ms"
else
    echo "❌ TIMEOUT"
fi

echo ""

# Security Status
echo "🛡️ Security Status:"
echo "------------------"

# Check for package vulnerabilities
if [ -f "site/package.json" ]; then
    echo -n "📦 Site Dependencies: "
    cd site
    vulnerabilities=$(npm audit --audit-level=moderate --json 2>/dev/null | jq -r '.metadata.vulnerabilities.total // 0' 2>/dev/null || echo "unknown")
    if [ "$vulnerabilities" = "0" ]; then
        echo "✅ NO VULNERABILITIES"
    elif [ "$vulnerabilities" = "unknown" ]; then
        echo "⚠️ UNABLE TO CHECK"
    else
        echo "⚠️ $vulnerabilities VULNERABILITIES"
    fi
    cd ..
fi

if [ -f "studio/package.json" ]; then
    echo -n "🎨 Studio Dependencies: "
    cd studio
    vulnerabilities=$(npm audit --audit-level=moderate --json 2>/dev/null | jq -r '.metadata.vulnerabilities.total // 0' 2>/dev/null || echo "unknown")
    if [ "$vulnerabilities" = "0" ]; then
        echo "✅ NO VULNERABILITIES"
    elif [ "$vulnerabilities" = "unknown" ]; then
        echo "⚠️ UNABLE TO CHECK"
    else
        echo "⚠️ $vulnerabilities VULNERABILITIES"
    fi
    cd ..
fi

echo ""

# Project Statistics
echo "📈 Project Statistics:"
echo "---------------------"

# Count lines of code
if command -v find &> /dev/null; then
    echo -n "📝 Lines of Code (TypeScript): "
    find . -name "*.ts" -not -path "./node_modules/*" -not -path "./.next/*" -not -path "./dist/*" | xargs wc -l 2>/dev/null | tail -1 | awk '{print $1}' || echo "N/A"

    echo -n "📝 Lines of Code (JavaScript): "
    find . -name "*.js" -not -path "./node_modules/*" -not -path "./.next/*" -not -path "./dist/*" | xargs wc -l 2>/dev/null | tail -1 | awk '{print $1}' || echo "N/A"

    echo -n "🎨 Lines of Code (Astro): "
    find . -name "*.astro" -not -path "./node_modules/*" | xargs wc -l 2>/dev/null | tail -1 | awk '{print $1}' || echo "N/A"
fi

# Git statistics
if command -v git &> /dev/null; then
    echo -n "📊 Total Commits: "
    git rev-list --count HEAD 2>/dev/null || echo "N/A"

    echo -n "👥 Contributors: "
    git shortlog -sn | wc -l 2>/dev/null || echo "N/A"

    echo -n "📅 Last Commit: "
    git log -1 --format="%cr" 2>/dev/null || echo "N/A"
fi

echo ""

# Deployment Information
echo "🚀 Deployment Information:"
echo "-------------------------"
echo "🔒 Zitadel: https://auth.wenzelarifiandi.com"
echo "🖥️ Console: https://auth.wenzelarifiandi.com/ui/console"
echo "📋 Security: https://github.com/WenzelArifiandi/ariane/security"
echo "🤖 Actions: https://github.com/WenzelArifiandi/ariane/actions"

echo ""

# Quick Health Summary
echo "📋 Quick Health Summary:"
echo "-----------------------"

# Calculate overall health score
health_score=0
total_checks=0

# Check Zitadel
if curl -s --max-time 10 https://auth.wenzelarifiandi.com/.well-known/openid-configuration >/dev/null 2>&1; then
    health_score=$((health_score + 1))
fi
total_checks=$((total_checks + 1))

# Check Console
if curl -s --max-time 10 https://auth.wenzelarifiandi.com/ui/console >/dev/null 2>&1; then
    health_score=$((health_score + 1))
fi
total_checks=$((total_checks + 1))

# Calculate percentage
if [ $total_checks -gt 0 ]; then
    health_percentage=$((health_score * 100 / total_checks))

    if [ $health_percentage -eq 100 ]; then
        echo "🎉 System Status: 🟢 ALL SYSTEMS OPERATIONAL ($health_percentage%)"
    elif [ $health_percentage -ge 80 ]; then
        echo "⚠️ System Status: 🟡 MOSTLY OPERATIONAL ($health_percentage%)"
    else
        echo "🚨 System Status: 🔴 DEGRADED PERFORMANCE ($health_percentage%)"
    fi
else
    echo "❓ System Status: UNKNOWN"
fi

echo ""
echo "---"
echo "💡 For real-time status, check the badges in README.md"
echo "🔄 Run this script with: bash scripts/status-dashboard.sh"