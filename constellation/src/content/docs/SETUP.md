---
title: GitHub Actions Setup Guide
slug: setup
description: "# GitHub Actions Setup Guide"
---



# GitHub Actions Setup Guide

This guide will help you configure GitHub Actions for automatic deployment to Oracle Cloud.

## Required GitHub Secrets

Go to your repository **Settings → Secrets and variables → Actions** and add:

### 🔑 SSH Configuration

**`ORACLE_SSH_KEY`**
```bash
# Copy your private SSH key content
cat ~/.ssh/oracle_key_correct
```
Paste the entire private key (including `-----BEGIN...` and `-----END...` lines)

**`ORACLE_HOST`**
```
79.72.87.238
```

## How It Works

### 🔄 Automatic Deployment
- **Trigger**: When you push changes to `zitadel/` folder on `main` branch
- **Process**:
  1. 🔍 Detects configuration changes
  2. 💾 Creates automatic backup
  3. 🚀 Deploys new configuration
  4. 🏥 Runs health checks
  5. 🆘 Auto-rollback if deployment fails

### 🔒 Security Features
- Trivy security scanning on every push
- Secrets are never logged
- SSH keys are temporarily created and destroyed
- Automatic vulnerability detection

### 💾 Backup Strategy
- Automatic backup before every deployment
- Database dump included
- Keeps last 5 backups
- One-click rollback capability

## Testing the Setup

### 1. Manual Trigger
Go to **Actions → Deploy Zitadel to Oracle Cloud → Run workflow**

### 2. Test with Small Change
Edit `zitadel/README.md` and push to main branch:
```bash
echo "Test deployment at $(date)" >> zitadel/README.md
git add zitadel/README.md
git commit -m "Test GitOps deployment"
git push
```

### 3. Monitor Deployment
- Watch the Actions tab for real-time progress
- Check logs for detailed deployment steps
- Verify health at https://auth.wenzelarifiandi.com

## Troubleshooting

### ❌ SSH Connection Failed
- Verify `ORACLE_SSH_KEY` contains the complete private key
- Ensure `ORACLE_HOST` IP is correct
- Check Oracle Cloud security rules allow SSH from GitHub Actions IPs

### ❌ Health Check Failed
- Check Zitadel logs: `docker-compose logs zitadel`
- Verify all services are running: `docker-compose ps`
- Manual rollback: Use latest backup in `/home/ubuntu/zitadel-backups/`

### ❌ Permission Denied
- Ensure SSH key has correct permissions on Oracle Cloud
- Verify Ubuntu user can access Docker commands

## Advanced Features

### 🔄 Zero-Downtime Deployments
- Services are updated with `docker-compose up -d`
- Health checks ensure service availability
- Automatic rollback prevents extended downtime

### 📊 Monitoring Integration
Ready for integration with:
- Grafana Cloud (free tier)
- Uptime Robot (free monitoring)
- GitHub Security alerts

### 🌍 Multi-Environment Support
Extend for staging/production environments:
- Add environment-specific secrets
- Create separate workflows
- Use environment protection rules

## Next Steps

1. ✅ Add the required secrets
2. ✅ Test with a small change
3. ✅ Set up monitoring (optional)
4. ✅ Add team notifications (optional)

Your Zitadel deployment is now fully automated! 🎉