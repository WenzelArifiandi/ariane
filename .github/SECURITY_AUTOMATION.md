# 🛡️ Security Automation Guide

This document explains the comprehensive security automation system implemented for the Ariane project.

## 🎯 Overview

The repository includes a fully automated security system that:
- **Detects** vulnerabilities across all dependencies and code
- **Fixes** security issues automatically when safe
- **Monitors** for new threats continuously
- **Reports** security status transparently

## 🔧 Automated Systems

### 1. 🤖 Dependabot Configuration
**File:** `.github/dependabot.yml`

- **Daily updates** for site and studio dependencies
- **Weekly updates** for GitHub Actions and Docker images
- **Auto-merge** enabled for patch/minor/security updates
- **Grouped updates** for related packages (Astro, TypeScript, etc.)

### 2. 🛡️ Auto Security Fixes
**File:** `.github/workflows/auto-security-fixes.yml`

**Triggers:**
- Daily at 2 AM UTC (scheduled)
- When Dependabot creates PRs
- Manual trigger via workflow_dispatch

**Actions:**
- Runs `npm audit` on all projects
- Applies `npm audit fix` automatically
- Tests builds after fixes
- Auto-commits security patches
- Auto-merges safe Dependabot PRs

### 3. 🔍 Security Scanning
**File:** `.github/workflows/security-scanning.yml`

**Triggers:**
- Every push to main
- All pull requests
- Weekly on Sundays at 3 AM UTC

**Scans:**
- **CodeQL** - JavaScript/TypeScript code analysis
- **Trivy** - Dependency and Docker vulnerabilities
- **Snyk** - Additional vulnerability detection
- **TruffleHog** - Secret detection
- **GitLeaks** - Git history secret scanning

### 4. 🚀 Deployment Security
**Enhanced in:** `.github/workflows/deploy-zitadel.yml`

**Pre-deployment:**
- Security audit of all dependencies
- Automatic vulnerability fixes
- Secret pattern detection
- Trivy configuration scanning

## 📋 Security Features

### ✅ Vulnerability Detection

| Type | Tool | Frequency | Auto-Fix |
|------|------|-----------|----------|
| Dependencies | npm audit | Daily | ✅ |
| Code | CodeQL | Every push | ❌ |
| Secrets | TruffleHog/GitLeaks | Every push | ❌ |
| Docker | Trivy | Weekly | ❌ |
| Dependencies | Snyk | Weekly | ❌ |

### 🔄 Auto-Merge Rules

Dependabot PRs are automatically approved and merged if:
- ✅ Security updates (any severity)
- ✅ Patch version updates (e.g., 1.2.3 → 1.2.4)
- ✅ Minor version updates (e.g., 1.2.0 → 1.3.0)
- ❌ Major version updates (requires manual review)

### 📊 Reporting

- **Security summaries** on every PR
- **Weekly vulnerability reports** uploaded as artifacts
- **Security configuration status** tracked monthly
- **Auto-fix reports** for transparency

## 🔐 Repository Security Settings

### Enabled Features
- ✅ **Vulnerability alerts** - Get notified of new CVEs
- ✅ **Security updates** - Dependabot creates PRs for vulnerabilities
- ✅ **Secret scanning** - Detect committed secrets
- ✅ **Push protection** - Block pushes containing secrets
- ✅ **Code scanning** - Automated CodeQL analysis

### Recommended Settings
- **Branch protection** for main branch
- **Require status checks** before merging
- **Require up-to-date branches**
- **Two-factor authentication** for all contributors

## 🚀 Getting Started

### 1. Initial Setup
Run the security setup workflow manually:
```bash
# Go to Actions tab → "Security Setup & Configuration" → "Run workflow"
```

### 2. Monitor Security
Check these locations regularly:
- **Security tab** - View active alerts and advisories
- **Actions tab** - Monitor automated scans and fixes
- **Pull requests** - Review Dependabot updates

### 3. Respond to Alerts
- **High/Critical vulnerabilities** - Auto-fixed daily
- **Medium vulnerabilities** - Auto-fixed weekly
- **Manual review needed** - Tagged with labels, assigned to maintainers

## ⚙️ Configuration

### Customizing Auto-Merge Rules
Edit `.github/dependabot.yml`:
```yaml
allow:
  - dependency-type: "direct"
    update-type: "security"      # Always auto-merge security
  - dependency-type: "direct"
    update-type: "version-update:semver-patch"  # Auto-merge patches
```

### Adjusting Scan Frequency
Edit workflow schedules:
```yaml
schedule:
  - cron: '0 2 * * *'  # Daily at 2 AM UTC
```

### Adding Custom Security Checks
Add steps to security workflows:
```yaml
- name: Custom Security Check
  run: |
    # Your custom security validation
```

## 🔧 Troubleshooting

### Auto-Merge Not Working
1. Check branch protection rules
2. Verify PR passes all required checks
3. Ensure Dependabot has proper permissions

### Security Scans Failing
1. Check workflow logs in Actions tab
2. Verify tokens and permissions
3. Review scan configuration

### False Positives
1. Add exclusions to scan configurations
2. Use `.trivyignore` for Trivy
3. Configure CodeQL query filters

## 📈 Security Metrics

Track security improvements:
- **Vulnerability count trends** (should decrease)
- **Mean time to fix** (should decrease)
- **Auto-fix success rate** (should increase)
- **Manual intervention frequency** (should decrease)

## 🚨 Emergency Procedures

### Critical Vulnerability Discovered
1. **Immediate:** Security scans will detect within 24 hours
2. **Auto-fix:** Applied automatically if safe
3. **Manual:** Tagged and assigned if requires intervention
4. **Deployment:** Blocks deployment if critical

### Compromised Dependencies
1. **Detection:** Multiple scanning tools provide coverage
2. **Response:** Auto-removal if possible, manual review otherwise
3. **Rollback:** Deployment pipeline includes automatic rollback

### Security Incident
1. **Notification:** Check Security tab and email alerts
2. **Assessment:** Review scan results and affected components
3. **Mitigation:** Use automated fixes or manual intervention
4. **Documentation:** Track in security issues

---

## 📚 Additional Resources

- [GitHub Security Features](https://docs.github.com/en/code-security)
- [Dependabot Configuration](https://docs.github.com/en/code-security/dependabot)
- [CodeQL Documentation](https://codeql.github.com/docs/)
- [Trivy Scanner](https://aquasecurity.github.io/trivy/)

**🤖 This security system provides enterprise-grade protection with zero manual overhead!**