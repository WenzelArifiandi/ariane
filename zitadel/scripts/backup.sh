#!/bin/bash

# Zitadel Backup Script
# Creates comprehensive backups of configuration and data

set -e

BACKUP_DIR="${BACKUP_DIR:-/home/ubuntu/zitadel-backups}"
DEPLOYMENT_DIR="${DEPLOYMENT_DIR:-/home/ubuntu/zitadel}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"

echo "💾 Zitadel Backup Script - $(date)"
echo "=================================="
echo "Backup directory: $BACKUP_DIR"
echo "Source directory: $DEPLOYMENT_DIR"
echo "Retention: $RETENTION_DAYS days"
echo ""

# Create backup directory with timestamp
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
CURRENT_BACKUP="$BACKUP_DIR/backup-$TIMESTAMP"

echo "📦 Creating backup at: $CURRENT_BACKUP"
mkdir -p "$CURRENT_BACKUP"

# Backup configuration files
echo "📋 Backing up configuration files..."
if [ -d "$DEPLOYMENT_DIR" ]; then
    cp -r "$DEPLOYMENT_DIR"/* "$CURRENT_BACKUP/" 2>/dev/null || true
    echo "✅ Configuration files backed up"
else
    echo "⚠️ Deployment directory not found: $DEPLOYMENT_DIR"
fi

# Backup database
echo "🗄️ Backing up database..."
cd "$DEPLOYMENT_DIR" 2>/dev/null || cd /tmp

if docker-compose ps db | grep -q "Up"; then
    echo "📊 Database is running, creating dump..."
    if docker-compose exec -T db pg_dump -U postgres zitadel > "$CURRENT_BACKUP/database.sql" 2>/dev/null; then
        echo "✅ Database backup completed"

        # Compress database backup
        gzip "$CURRENT_BACKUP/database.sql"
        echo "🗜️ Database backup compressed"
    else
        echo "❌ Database backup failed"
    fi
else
    echo "⚠️ Database is not running, skipping database backup"
fi

# Backup Docker volumes (if any)
echo "📦 Backing up Docker volumes..."
if command -v docker &> /dev/null; then
    docker volume ls --format "table {{.Name}}" | grep zitadel | while read -r volume; do
        if [ -n "$volume" ]; then
            echo "💽 Backing up volume: $volume"
            docker run --rm -v "$volume:/data" -v "$CURRENT_BACKUP:/backup" alpine tar czf "/backup/volume-$volume.tar.gz" -C /data . 2>/dev/null || true
        fi
    done
    echo "✅ Volume backups completed"
fi

# Create backup manifest
echo "📝 Creating backup manifest..."
cat > "$CURRENT_BACKUP/manifest.json" << EOF
{
  "backup_timestamp": "$TIMESTAMP",
  "backup_date": "$(date -Iseconds)",
  "deployment_dir": "$DEPLOYMENT_DIR",
  "hostname": "$(hostname)",
  "zitadel_version": "$(docker-compose exec -T zitadel zitadel --version 2>/dev/null | head -n1 || echo 'unknown')",
  "files": [
$(find "$CURRENT_BACKUP" -type f -printf '    "%P",\n' | sed '$ s/,$//')
  ]
}
EOF

# Calculate backup size
BACKUP_SIZE=$(du -sh "$CURRENT_BACKUP" | cut -f1)
echo "📏 Backup size: $BACKUP_SIZE"

# Clean up old backups
echo "🧹 Cleaning up old backups (keeping last $RETENTION_DAYS days)..."
find "$BACKUP_DIR" -name "backup-*" -type d -mtime +$RETENTION_DAYS -exec rm -rf {} \; 2>/dev/null || true

# List all backups
echo ""
echo "📂 Available backups:"
ls -la "$BACKUP_DIR"/backup-* 2>/dev/null | tail -5 || echo "No previous backups found"

echo ""
echo "✅ Backup completed successfully!"
echo "📍 Location: $CURRENT_BACKUP"
echo "📏 Size: $BACKUP_SIZE"
echo ""
echo "🔄 To restore this backup:"
echo "   1. Stop services: docker-compose down"
echo "   2. Restore files: cp -r $CURRENT_BACKUP/* $DEPLOYMENT_DIR/"
echo "   3. Restore database: zcat $CURRENT_BACKUP/database.sql.gz | docker-compose exec -T db psql -U postgres zitadel"
echo "   4. Start services: docker-compose up -d"