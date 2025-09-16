# Zitadel Authentication Server

This directory contains the configuration for the Zitadel authentication server used by the Ariane project.

## Overview

Zitadel provides OIDC/OAuth2 authentication services for:
- User authentication and authorization
- Integration with Cloudflare Access
- Session management
- Multi-factor authentication (when enabled)

## Files

- `docker-compose.yml` - Docker Compose configuration for Zitadel, PostgreSQL, and Caddy
- `zitadel.yaml` - Zitadel server configuration
- `Caddyfile` - Caddy reverse proxy configuration with SSL
- `.env.example` - Environment variables template

## Current Deployment

**Production URL:** https://auth.wenzelarifiandi.com

**Services:**
- **Zitadel:** Authentication server (port 8080, proxied through Caddy)
- **PostgreSQL:** Database backend
- **Caddy:** Reverse proxy with automatic SSL (ZeroSSL)

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

**Default Admin User:**
- Username: `admin@zitadel.auth.wenzelarifiandi.com`
- Password: `Password1!`
- Console: https://auth.wenzelarifiandi.com/ui/console

**Important:** Change the default password after first login.

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
   - Rebuild projections: `docker-compose exec zitadel zitadel setup --init-projections`

### Logs
```bash
# View all logs
docker-compose logs

# View Zitadel logs only
docker-compose logs zitadel

# Follow logs
docker-compose logs -f zitadel
```

## Security Notes

- Change default passwords immediately
- Configure proper SMTP for email verification
- Set up proper backups
- Monitor logs for security events
- Keep Zitadel updated to latest stable version

## Version

Current Zitadel version: v2.65.1

## Support

For issues related to:
- Zitadel configuration: Check [Zitadel Documentation](https://zitadel.com/docs)
- Cloudflare integration: See `ops/zitadel-cloudflare-access-troubleshooting.md`
- Deployment issues: Check the logs and this README