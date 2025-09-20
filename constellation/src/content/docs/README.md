---
title: "Zitadel Authentication Server"
description: "# Zitadel Authentication Server"
slug: readme
---

# Zitadel Authentication Server

This directory contains the configuration for the Zitadel authentication server used by the Ariane project.

**🎯 User-Friendly Error Handling** - Added comprehensive error translation and better UX at 2025-09-16 18:00 UTC

## Overview

Zitadel provides OIDC/OAuth2 authentication services for:

- User authentication and authorization
- Integration with Cloudflare Access
- Session management
- Multi-factor authentication (when enabled)

## User-Friendly Error Handling ✨

This deployment includes enhanced error handling to translate cryptic Zitadel error codes into user-friendly messages:

### Error Code Translations

- `COMMAND-2M0fs` → "No changes detected - please modify at least one field"
- `COMMAND-J8dsk` → "User initialization required - complete setup process"
- `QUERY-d3fas` → "Database connection issue - try again in a moment"

### Features

- **Custom Error Pages**: Beautiful, actionable error messages instead of raw HTTP codes
- **Contextual Help**: Specific suggestions for each error type
- **Technical Details**: Expandable technical information for debugging
- **Smart Error Detection**: Automatic pattern matching and translation

### Files

- `error-handler.js` - JavaScript error translation library
- `custom-error-page.html` - Styled error page template
- `Caddyfile` - Enhanced with error interception and custom responses

## Files

- `docker-compose.yml` - Docker Compose configuration for Zitadel, PostgreSQL, and Caddy
- `zitadel.yaml` - Zitadel server configuration
- `Caddyfile` - Caddy reverse proxy configuration with SSL and error handling
- `.env.example` - Environment variables template

## Current Deployment

**Production URL:** https://auth.wenzelarifiandi.com

**Services:**

- **Zitadel:** Authentication server (port 8080, proxied through Caddy)
- **PostgreSQL:** Database backend
- **Caddy:** Reverse proxy with automatic SSL (ZeroSSL) and error translation

## Quick Start

1. Copy environment template:

   ```bash
   cp .env.example .env
   ```

2. Update environment variables in `.env`

3. Start services:

   ```bash
   docker-compose up -d
   ```

4. Initialize Zitadel (first time only):

   ```bash
   # Initialize database
   docker-compose exec zitadel zitadel init database
   docker-compose exec zitadel zitadel init user
   docker-compose exec zitadel zitadel init grant

   # Setup first instance with projections
   docker-compose exec zitadel zitadel setup --for-mirror --init-projections --masterkey "YOUR_MASTER_KEY"
   ```

## Configuration

### Master Key

The master key is used for encryption. Set it in your environment:

```bash
ZITADEL_MASTERKEY="MasterkeyNeedsToHave32Characters"
```

### External Domain

Update the external domain in both `docker-compose.yml` and `zitadel.yaml`:

```yaml
ZITADEL_EXTERNALDOMAIN=auth.yourdomain.com
```

### SSL Certificates

Currently configured to use ZeroSSL via Caddy. To switch providers, update the `Caddyfile`.

## Admin Access

**Console URL:** https://auth.wenzelarifiandi.com/ui/console

**First-time Setup:**

1. Use the admin credentials that were configured during initial setup
2. **Immediately change the default password** after first login
3. Enable MFA for additional security
4. Create additional admin users and disable the default account

**Security Note:** Default credentials should never be stored in version control or documentation.

## Cloudflare Access Integration

To integrate with Cloudflare Access:

1. **Create OIDC Application in Zitadel:**

   - Go to Projects → Create Project
   - Add Application → OIDC → Confidential
   - Set redirect URI to: `https://yourteam.cloudflareaccess.com/cdn-cgi/access/callback`

2. **Configure Cloudflare Access:**
   - Discovery URL: `https://auth.wenzelarifiandi.com/.well-known/openid-configuration`
   - Client ID and Secret from Zitadel application

## Backup and Recovery

### Database Backup

```bash
docker-compose exec db pg_dump -U postgres zitadel > backup.sql
```

### Configuration Backup

All configuration files are version controlled in this repository.

### Full Restore

1. Deploy using docker-compose
2. Restore database: `docker-compose exec -T db psql -U postgres zitadel < backup.sql`
3. Restart services: `docker-compose restart`

## Troubleshooting

### Common Issues

1. **Email Verification Required**

   - Admin users may need email verification
   - Manually verify in database or configure SMTP

2. **WebAuthn/Security Key Errors**

   - Check login policy settings
   - Disable mandatory MFA if not needed

3. **Profile Update Errors**
   - **"Profile not changed"**: You're trying to update with the same data - change at least one field
   - **"User not initialized"**: Complete the account setup process or verify email
   - Rebuild projections if needed: `docker-compose exec zitadel zitadel setup --init-projections`

### Logs

```bash
# View all logs
docker-compose logs

# View Zitadel logs only
docker-compose logs zitadel

# Follow logs
docker-compose logs -f zitadel

# View error handling logs
docker-compose exec caddy cat /var/log/caddy/zitadel-errors.log
```

## Security Notes

- Change default passwords immediately
- Configure proper SMTP for email verification
- Set up proper backups
- Monitor logs for security events
- Keep Zitadel updated to latest stable version

## Version

Current Zitadel version: v2.65.1

## Critical Runtime Remediation (Docker Compose / Healthcheck / SMTP)

Recent incident summary (Sept 2025):

1. `zitadel` container reported `unhealthy` due to a healthcheck using `wget`, which is not present in the official image.
2. Attempts to restart the stack began failing with `KeyError: 'ContainerConfig'` – an underlying Docker / docker-compose runtime metadata issue rather than an application misconfiguration.
3. SMTP block absent in `zitadel.yaml` led to `Errors.SMTPConfig.NotFound` noise in logs (non-fatal for core auth unless email flows needed).

### Fast Recovery Flow

```bash
# 0. SSH in
ssh -i ~/.ssh/oracle_key_correct ubuntu@<SERVER_IP>

cd ~/zitadel   # directory containing docker-compose.yml

# 1. Collect diagnostics (non-destructive)
bash scripts/triage.sh

# 2. Render/validate compose
docker compose config

# 3. Stop stack (ignore errors)
docker compose down --remove-orphans || true

# 4. Manually remove lingering containers if compose down fails early
docker ps -a --format '{{.ID}} {{.Names}}' | grep -E 'zitadel|caddy|postgres|db' | awk '{print $1}' | xargs -r docker rm -f

# 5. OPTIONAL: prune unused (SAFE-ish but global)
docker system prune -f

# 6. (If still KeyError) restart Docker engine
sudo systemctl restart docker

# 7. Bring up only Postgres first
docker compose up -d db
docker compose logs -f db | grep -m1 'database system is ready'

# 8. Start Zitadel (after editing healthcheck if needed)
docker compose up -d zitadel
docker compose logs --tail=120 zitadel

# 9. Start Caddy
docker compose up -d caddy
```

### Healthcheck Fix Options

Remove existing `healthcheck:` block OR replace with one that uses a built-in tool. Easiest is removal (Docker will still show running state). If you prefer a check:

```yaml
healthcheck:
  test: ["CMD-SHELL", "nc -z 127.0.0.1 8080 || exit 1"]
  interval: 30s
  timeout: 5s
  retries: 5
  start_period: 60s
```

This uses `nc` (busybox `netcat` is in most base images). If absent, simply delete the healthcheck.

### SMTP Configuration

Add minimal block to `zitadel.yaml` (do NOT commit secrets; use env for password):

```yaml
DefaultInstance:
  SMTPConfiguration:
    Host: smtp.resend.com:465
    User: resend
    Password: ${ZITADEL_SMTP_PASSWORD}
    From: hello@notify.wenzelarifiandi.com
    TLS: true
```

Compose environment (sanitize in real deployment):

```yaml
services:
  zitadel:
    environment:
      - ZITADEL_MASTERKEY=MasterkeyNeedsToHave32Characters
      - ZITADEL_SMTP_PASSWORD=REDACTED_SECRET
```

After restart, verify:

```bash
docker compose logs zitadel | grep -i smtp || echo 'SMTP lines not found'
```

If still missing: ensure the `zitadel.yaml` path (`/config/zitadel.yaml`) matches the mount and that the block indentation is correct.

### Detecting Compose Binary Issues

```bash
docker compose version
which docker-compose || true  # legacy symlink?
docker-compose version || true
```

If both binaries exist and conflict, remove legacy:

```bash
sudo rm -f /usr/local/bin/docker-compose
sudo apt-get update && sudo apt-get install --reinstall docker-compose-plugin
```

### Last Resort (Hard Reset Docker Engine)

Only if metadata corruption persists and data can be lost / already backed up:

```bash
sudo systemctl stop docker
sudo tar -C /var/lib -czf ~/docker-lib-backup-$(date +%s).tgz docker
sudo mv /var/lib/docker /var/lib/docker.broken.$(date +%s)
sudo systemctl start docker
docker compose pull
docker compose up -d
```

### Post-Fix Validation Checklist

- [ ] `docker compose ps` shows all three services `Up` (no `(health: starting)` loop)
- [ ] `docker compose logs --tail=50 zitadel` contains startup without repeating crash loops
- [ ] Access `https://auth.wenzelarifiandi.com/.well-known/openid-configuration` returns JSON
- [ ] (If SMTP configured) No `Errors.SMTPConfig.NotFound` lines in recent logs
- [ ] Admin console reachable: `/ui/console`
- [ ] Optional: Send a test email (trigger password reset) and confirm delivery

### Automation Aid

Use the added script:

```bash
cd zitadel
bash scripts/triage.sh
ls -1 triage-*  # choose newest folder
```

Attach the produced tarball for further analysis if escalation is needed.

### Remote SSH Helper

From repo root (local workstation) you can launch an interactive remediation session with pre-filled guidance:

```bash
./scripts/zitadel-remote-session.sh            # uses ubuntu@auth.wenzelarifiandi.com and key at ~/.ssh/oracle_key_correct

# Override target or key
SSH_KEY_PATH=~/.ssh/alternative_key \
   ./scripts/zitadel-remote-session.sh otheruser@yourhost.example.com path/to/zitadel
```

Inside the remote shell it prints suggested next commands (triage, healthcheck removal, restart sequence).

---

## Advanced: Minimal Patch to Remove Healthcheck

Diff concept (do manually if editing live server):

```diff
 services:
    zitadel:
       image: ghcr.io/zitadel/zitadel:v2.65.1
@@
-    healthcheck:
-      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:8080/debug/healthz"]
-      interval: 30s
-      timeout: 10s
-      retries: 3
-      start_period: 60s
```

Apply, then:

```bash
docker compose up -d --force-recreate zitadel
```

---

## Future Hardening Ideas

- Build a tiny sidecar health probe (alpine + curl) if deeper layer 7 checks required.
- Add watchtower or CI pipeline step for controlled image upgrades.
- Implement automated nightly `pg_dump` to off-host storage.
- Add structured log shipping (e.g., Vector + OpenSearch) for audit trails.

## Troubleshooting & Status Checking

### Quick Status Check

Use the comprehensive status checker from the repository root:

```bash
./scripts/deployment-status.sh
```

This script will:

- ✅ Check service health and endpoints
- 📍 Show current deployment version
- 💡 Provide specific troubleshooting guidance
- 🛠️ Suggest immediate actions based on the issue

### Common Issues & Solutions

#### Service Not Responding (HTTP 000/timeout)

**Possible Causes:**

- Deployment in progress (wait 2-3 minutes)
- Oracle Cloud instance issues
- Docker services failed to start
- Network connectivity problems

**Quick Fixes:**

1. Check GitHub Actions for failed deployments
2. Wait a few minutes if deployment just triggered
3. For immediate access: SSH to server and check `docker-compose ps`

#### Browser Shows Old Error Messages

**After a successful deployment fix:**

1. **Hard refresh:** Ctrl+Shift+R (Windows) / Cmd+Shift+R (Mac)
2. **Chrome/Edge:** DevTools (F12) → right-click refresh → "Empty Cache and Hard Reload"
3. **Try incognito/private browsing window**
4. **Clear browser cache** for auth.wenzelarifiandi.com

#### Version Verification

**Check what's deployed on server:**

```bash
ssh ubuntu@auth.wenzelarifiandi.com 'cat /home/ubuntu/zitadel/.deployment_state'
```

**Compare with current repository:**

```bash
git rev-parse HEAD
```

**Force deployment if out of sync:**

```bash
gh workflow run "Deploy Zitadel to Oracle Cloud" --field force=true
```

### Manual Server Commands

**Check service status:**

```bash
ssh ubuntu@auth.wenzelarifiandi.com 'cd zitadel && docker-compose ps'
```

**View recent logs:**

```bash
ssh ubuntu@auth.wenzelarifiandi.com 'cd zitadel && docker-compose logs --tail=50'
```

**Restart all services:**

```bash
ssh ubuntu@auth.wenzelarifiandi.com 'cd zitadel && docker-compose restart'
```

**Check Caddy logs specifically:**

```bash
ssh ubuntu@auth.wenzelarifiandi.com 'cd zitadel && docker-compose logs caddy --tail=20'
```

## Support

For issues related to:

- Zitadel configuration: Check [Zitadel Documentation](https://zitadel.com/docs)
- Cloudflare integration: See `ops/zitadel-cloudflare-access-troubleshooting.md`
- Deployment issues: Use `./scripts/deployment-status.sh` and check GitHub Actions
- Error handling: Check `error-handler.js` for supported error codes
- Initializing users properly (avoiding DB flips): See `../ops/zitadel-user-initialization.md`
