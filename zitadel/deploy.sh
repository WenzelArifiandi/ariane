#!/bin/bash

# Zitadel Deployment Script
# This script helps deploy Zitadel with proper initialization

set -e

echo "🚀 Zitadel Deployment Script"
echo "================================"

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Please copy .env.example to .env and configure it."
    exit 1
fi

# Source environment variables
source .env

echo "📋 Configuration:"
echo "  Domain: $ZITADEL_EXTERNALDOMAIN"
echo "  Admin Email: $ZITADEL_ADMIN_EMAIL"
echo ""

# Start database first
echo "🗄️  Starting database..."
docker-compose up -d db
sleep 10

# Initialize database
echo "🔧 Initializing database..."
docker-compose run --rm zitadel init database

echo "👤 Creating database user..."
docker-compose run --rm zitadel init user

echo "🔐 Setting database permissions..."
docker-compose run --rm zitadel init grant

# Start all services
echo "🌐 Starting all services..."
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 30

# Setup first instance
echo "🎯 Setting up first instance..."
docker-compose run --rm zitadel setup --for-mirror --init-projections --masterkey "$ZITADEL_MASTERKEY"

# Restart to apply all changes
echo "🔄 Restarting services..."
docker-compose restart

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🌍 Access Zitadel at: https://$ZITADEL_EXTERNALDOMAIN"
echo "🖥️  Console: https://$ZITADEL_EXTERNALDOMAIN/ui/console"
echo "👤 Admin: $ZITADEL_ADMIN_EMAIL"
echo "🔑 Password: (as configured in .env)"
echo ""
echo "📚 Next steps:"
echo "  1. Log in to the console and change the admin password"
echo "  2. Configure OIDC applications for your services"
echo "  3. Set up proper SMTP for email notifications"
echo ""