#!/bin/bash

# Sync Zitadel Database from Oracle to Local
# Downloads the latest production data for local development

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ZITADEL_DIR="$(dirname "$SCRIPT_DIR")"
ORACLE_HOST="${ORACLE_HOST:-auth.wenzelarifiandi.com}"
SSH_USER="${SSH_USER:-ubuntu}"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/oracle_key_correct}"
TEMP_BACKUP="/tmp/oracle-db-sync-$(date +%Y%m%d-%H%M%S).sql"

echo "🔄 Zitadel Database Sync: Oracle → Local"
echo "======================================="
echo "Oracle Host: $ORACLE_HOST"
echo "SSH User: $SSH_USER"
echo "SSH Key: $SSH_KEY"
echo "Local Zitadel Dir: $ZITADEL_DIR"
echo "Temp Backup: $TEMP_BACKUP"
echo ""

# Verify SSH key exists
if [ ! -f "$SSH_KEY" ]; then
    echo "❌ SSH key not found: $SSH_KEY"
    echo "💡 Make sure the Oracle SSH key is available at the expected location"
    exit 1
fi

# Verify local Docker is running
echo "🐳 Checking local Docker setup..."
cd "$ZITADEL_DIR"

if ! docker compose ps db | grep -q "healthy\|Up"; then
    echo "⚠️ Local database is not running. Starting it..."
    docker compose up -d db
    echo "⏳ Waiting for local database to be ready..."
    for i in {1..30}; do
        if docker compose exec -T db pg_isready -U postgres -d zitadel >/dev/null 2>&1; then
            echo "✅ Local database is ready"
            break
        fi
        if [ $i -eq 30 ]; then
            echo "❌ Local database failed to start after 30 attempts"
            exit 1
        fi
        sleep 2
    done
else
    echo "✅ Local database is running"
fi

# Create backup of current local database (just in case)
echo ""
echo "💾 Creating safety backup of current local database..."
LOCAL_BACKUP="/tmp/local-db-backup-$(date +%Y%m%d-%H%M%S).sql"
if docker compose exec -T db pg_dump -U postgres zitadel > "$LOCAL_BACKUP" 2>/dev/null; then
    echo "✅ Local database backed up to: $LOCAL_BACKUP"
    echo "   (You can restore with: cat '$LOCAL_BACKUP' | docker compose exec -T db psql -U postgres -d zitadel)"
else
    echo "⚠️ Could not backup local database (it might be empty)"
fi

# Connect to Oracle and create database dump
echo ""
echo "📡 Connecting to Oracle instance and creating database dump..."
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$SSH_USER@$ORACLE_HOST" "
    cd zitadel || { echo 'Oracle zitadel directory not found'; exit 1; }
    
    echo '🔍 Checking Oracle database status...'
    if ! docker-compose exec -T db pg_isready -U postgres -d zitadel >/dev/null 2>&1; then
        echo '❌ Oracle database is not ready'
        exit 1
    fi
    
    echo '📊 Oracle database user count:'
    docker-compose exec -T db psql -U postgres -d zitadel -c 'SELECT COUNT(*) as user_count FROM projections.users13;'
    
    echo '💾 Creating database dump...'
    docker-compose exec -T db pg_dump -U postgres --no-owner --no-privileges --clean --if-exists zitadel
" > "$TEMP_BACKUP"

if [ ! -s "$TEMP_BACKUP" ]; then
    echo "❌ Failed to create Oracle database dump"
    exit 1
fi

echo "✅ Oracle database dump created ($(du -h "$TEMP_BACKUP" | cut -f1))"

# Restore to local database
echo ""
echo "🔄 Restoring Oracle data to local database..."

# Stop Zitadel to release database connections
echo "🛑 Stopping local Zitadel service..."
docker compose stop zitadel

# Drop and recreate the local database to ensure clean state
echo "🗑️ Dropping and recreating local database..."
docker compose exec -T db psql -U postgres -c "DROP DATABASE IF EXISTS zitadel;"
docker compose exec -T db psql -U postgres -c "CREATE DATABASE zitadel;"

# Restore the dump
echo "📥 Importing Oracle data..."
if cat "$TEMP_BACKUP" | docker compose exec -T db psql -U postgres -d zitadel >/dev/null 2>&1; then
    echo "✅ Database import completed successfully"
    
    # Fix permissions for local environment
    echo "🔧 Fixing database permissions for local environment..."
    docker compose exec -T db psql -U postgres -d zitadel -c "
        -- Grant necessary permissions to zitadel user
        GRANT ALL PRIVILEGES ON SCHEMA system TO zitadel;
        GRANT ALL PRIVILEGES ON SCHEMA projections TO zitadel;
        GRANT ALL PRIVILEGES ON SCHEMA eventstore TO zitadel;
        GRANT ALL PRIVILEGES ON SCHEMA auth TO zitadel;
        GRANT ALL PRIVILEGES ON SCHEMA adminapi TO zitadel;
        GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA system TO zitadel;
        GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA system TO zitadel;
        GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA projections TO zitadel;
        GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA projections TO zitadel;
        GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA eventstore TO zitadel;
        GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA eventstore TO zitadel;
        GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA auth TO zitadel;
        GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA auth TO zitadel;
        GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA adminapi TO zitadel;
        GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA adminapi TO zitadel;
    " >/dev/null 2>&1 || echo "⚠️ Some permission grants may have failed (this is often normal)"
    
else
    echo "❌ Database import failed"
    echo "🔄 Attempting to restore local backup..."
    if [ -f "$LOCAL_BACKUP" ] && [ -s "$LOCAL_BACKUP" ]; then
        docker compose exec -T db psql -U postgres -c "DROP DATABASE IF EXISTS zitadel;"
        docker compose exec -T db psql -U postgres -c "CREATE DATABASE zitadel;"
        cat "$LOCAL_BACKUP" | docker compose exec -T db psql -U postgres -d zitadel >/dev/null 2>&1
        echo "✅ Local backup restored"
    fi
    exit 1
fi

# Verify the sync
echo ""
echo "🔍 Verifying sync results..."
LOCAL_USER_COUNT=$(docker compose exec -T db psql -U postgres -d zitadel -c "SELECT COUNT(*) FROM projections.users13;" -t | tr -d ' \n')
echo "👥 Local database now has $LOCAL_USER_COUNT users"

echo "📋 Local users:"
docker compose exec -T db psql -U postgres -d zitadel -c "SELECT username, creation_date FROM projections.users13 ORDER BY creation_date;"

# Start Zitadel to pick up the new data
echo ""
echo "🔄 Starting local Zitadel to pick up new data..."
docker compose up -d zitadel

echo "⏳ Waiting for Zitadel to start..."
sleep 10

# Check if Zitadel is healthy
for i in {1..12}; do
    if curl -s -f http://localhost:8080/debug/healthz >/dev/null 2>&1; then
        echo "✅ Local Zitadel is healthy and ready"
        break
    fi
    if [ $i -eq 12 ]; then
        echo "⚠️ Zitadel is taking longer than expected to start"
        echo "   Check logs with: docker compose logs zitadel"
    fi
    sleep 5
done

# Cleanup
echo ""
echo "🧹 Cleaning up temporary files..."
rm -f "$TEMP_BACKUP"
[ -f "$LOCAL_BACKUP" ] && echo "📁 Local backup kept at: $LOCAL_BACKUP"

echo ""
echo "🎉 Database sync completed successfully!"
echo ""
echo "🌐 Your local Zitadel now has the latest production data from Oracle"
echo "🔗 Local Console: http://localhost:8080/ui/console"
echo "📊 Users synced: $LOCAL_USER_COUNT"
echo ""
echo "⚠️  Important Notes:"
echo "   • Local data was replaced with Oracle production data"
echo "   • Changes made locally will NOT sync back to Oracle automatically"
echo "   • To sync again, just run this script: ./scripts/sync-from-oracle.sh"
echo ""