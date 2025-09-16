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