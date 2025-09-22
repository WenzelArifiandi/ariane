# Backblaze B2 Setup for PostgreSQL Backups

This guide configures Backblaze B2 cloud storage for automated PostgreSQL backups using pgBackRest.

## Overview

pgBackRest will automatically backup your PostgreSQL database to Backblaze B2:
- **Full backups**: Weekly (retained for 2 weeks)
- **Differential backups**: Daily (retained for 1 week)
- **WAL archives**: Continuous (retained for 2 weeks)
- **Point-in-time recovery**: Restore to any second within retention period

## B2 Account Setup

### 1. Create Backblaze Account

1. Go to [Backblaze B2](https://www.backblaze.com/b2/cloud-storage.html)
2. Sign up for an account
3. Navigate to **B2 Cloud Storage**

### 2. Create Application Key

1. Go to **App Keys** in the B2 dashboard
2. Click **Add a New Application Key**
3. Configure the key:

```
Key Name: ariane-postgres-backups
Allow access to: Allow access to a single bucket
Bucket: (create bucket first - see step 3)
Capabilities:
  ✓ listBuckets
  ✓ listFiles
  ✓ readFiles
  ✓ shareFiles
  ✓ writeFiles
  ✓ deleteFiles
```

### 3. Create Bucket

1. Go to **Buckets** in B2 dashboard
2. Click **Create a Bucket**
3. Configure:

```
Bucket Name: ariane-postgres-backups
Files in Bucket are: Private
Default Encryption: Disable (pgBackRest handles encryption)
Object Lock: Disable
Lifecycle Settings: (leave default - 1 day hide/delete)
```

### 4. Get Credentials

After creating the application key, you'll receive:
- **keyID**: `004ab1c2d3e4f5a6b7c8d9e0`
- **applicationKey**: `K004ab1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8`
- **Endpoint**: `s3.us-west-004.backblazeb2.com`

## Configuration

### Update Secrets

Add B2 credentials to your encrypted secrets:

```bash
cd infrastructure/ansible
sops secrets/cell-v0.yml
```

Add these values:
```yaml
# Backup Configuration
pgbackrest_s3_key: "004ab1c2d3e4f5a6b7c8d9e0"
pgbackrest_s3_key_secret: "K004ab1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8"
pgbackrest_s3_bucket: "ariane-postgres-backups"
pgbackrest_s3_region: "us-west-004"
pgbackrest_s3_endpoint: "s3.us-west-004.backblazeb2.com"
```

### Test Configuration

After deployment, verify backups work:

```bash
# SSH to PostgreSQL VM
ssh ubuntu@db-vm-ip

# Test B2 connectivity
sudo -u postgres pgbackrest info --stanza=main

# Run manual backup
sudo -u postgres pgbackrest backup --stanza=main --type=full

# Verify backup exists
sudo -u postgres pgbackrest info --stanza=main
```

## Backup Schedule

The PostgreSQL role automatically configures these cron jobs:

```bash
# Full backup - Sunday 2 AM
0 2 * * 0 postgres pgbackrest backup --stanza=main --type=full

# Differential backup - Monday-Saturday 2 AM
0 2 * * 1-6 postgres pgbackrest backup --stanza=main --type=diff

# Archive check - Every hour
0 * * * * postgres pgbackrest check --stanza=main
```

## Monitoring

### Check Backup Status

```bash
# View backup information
sudo -u postgres pgbackrest info --stanza=main

# Check recent backups
sudo -u postgres pgbackrest info --stanza=main --output=json | jq .

# View backup logs
sudo tail -f /var/log/pgbackrest/main-backup.log
```

### Grafana Dashboard

The deployment includes a PostgreSQL backup dashboard showing:
- Backup success/failure rates
- Backup duration trends
- Storage usage
- Recovery time objectives

## Recovery Procedures

### Point-in-Time Recovery

```bash
# Stop PostgreSQL
sudo systemctl stop postgresql

# Restore to latest backup
sudo -u postgres pgbackrest restore --stanza=main --delta

# Restore to specific point in time
sudo -u postgres pgbackrest restore --stanza=main \
  --type=time --target="2024-01-15 14:30:00" --delta

# Start PostgreSQL
sudo systemctl start postgresql
```

### Clone Database

```bash
# Create test database from backup
sudo -u postgres pgbackrest restore --stanza=main \
  --pg1-path=/var/lib/postgresql/test --delta
```

## Cost Optimization

### B2 Pricing (as of 2024)

- **Storage**: $0.005/GB/month
- **Download**: $0.01/GB
- **API calls**: First 2,500 daily free, then $0.004/10k

### Estimated Costs

For a typical Zitadel database:
- **Database size**: ~5GB
- **Daily differential**: ~100MB
- **Weekly full**: ~5GB
- **Monthly storage**: ~25GB = **$0.125/month**
- **Annual cost**: ~**$1.50/year**

### Retention Optimization

Adjust retention in `group_vars/all/main.yml`:
```yaml
pgbackrest_retention_full: 2      # Keep 2 full backups
pgbackrest_retention_diff: 7      # Keep 7 differential backups
pgbackrest_retention_archive: 14  # Keep 14 days of WAL
```

## Security

### Encryption

pgBackRest encrypts all backups using AES-256:
- **Encryption key**: Auto-generated and stored in PostgreSQL VM
- **At-rest**: All files encrypted in B2
- **In-transit**: TLS encryption to B2

### Access Control

- B2 application key limited to single bucket
- No access to other B2 buckets or account settings
- PostgreSQL system user owns all backup operations
- Network-level restriction to PostgreSQL VM only

## Troubleshooting

### Common Issues

**Backup fails with S3 error**:
```bash
# Check B2 credentials
sudo -u postgres pgbackrest check --stanza=main

# Test S3 connectivity manually
aws s3 ls s3://ariane-postgres-backups \
  --endpoint-url=https://s3.us-west-004.backblazeb2.com
```

**High backup costs**:
- Check retention settings
- Monitor differential backup sizes
- Consider compression settings

**Recovery failures**:
- Verify backup integrity: `pgbackrest check --stanza=main`
- Check PostgreSQL logs: `/var/log/postgresql/`
- Ensure sufficient disk space for restore

### Monitoring Alerts

Set up alerts for:
- Backup failure (no backup in 25 hours)
- High backup duration (>2 hours)
- Storage quota exceeded
- B2 API errors

This ensures reliable, automated backups with point-in-time recovery capabilities for your Zitadel database.