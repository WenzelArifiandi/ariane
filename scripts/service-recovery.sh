#!/bin/bash
# Zitadel Service Recovery Script
# Monitors and auto-restarts failed services

set -e

ZITADEL_DIR="/home/ubuntu/zitadel"
LOG_FILE="/home/ubuntu/service-recovery.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

check_service_health() {
    local service=$1
    cd "$ZITADEL_DIR"

    # Check if service is running
    if ! docker-compose ps "$service" | grep -q "Up"; then
        return 1
    fi

    # Additional health checks
    case "$service" in
        "db")
            # Check PostgreSQL connectivity
            if ! docker-compose exec -T db pg_isready -U postgres -d zitadel >/dev/null 2>&1; then
                return 1
            fi
            ;;
        "zitadel")
            # Check Zitadel health endpoint
            if ! docker-compose exec -T zitadel wget --quiet --tries=1 --spider http://localhost:8080/debug/healthz >/dev/null 2>&1; then
                return 1
            fi
            ;;
        "caddy")
            # Check if Caddy is serving requests
            if ! curl -f -s https://auth.wenzelarifiandi.com/debug/healthz >/dev/null 2>&1; then
                return 1
            fi
            ;;
    esac

    return 0
}

restart_service() {
    local service=$1
    cd "$ZITADEL_DIR"

    log "🔄 Restarting $service service..."

    case "$service" in
        "db")
            # Database needs careful restart
            docker-compose stop "$service"
            sleep 5
            docker-compose up -d "$service"
            sleep 15
            ;;
        "zitadel")
            # Zitadel depends on database
            docker-compose restart "$service"
            sleep 30
            ;;
        "caddy")
            # Caddy can restart quickly
            docker-compose restart "$service"
            sleep 10
            ;;
    esac

    log "✅ $service service restart completed"
}

main() {
    log "🔍 Starting service health check..."

    services=("db" "zitadel" "caddy")
    failed_services=()

    for service in "${services[@]}"; do
        if ! check_service_health "$service"; then
            log "❌ $service service is unhealthy"
            failed_services+=("$service")
        else
            log "✅ $service service is healthy"
        fi
    done

    if [ ${#failed_services[@]} -eq 0 ]; then
        log "🎉 All services are healthy"
        return 0
    fi

    log "🚨 Found ${#failed_services[@]} failed service(s): ${failed_services[*]}"

    # Restart services in dependency order
    for service in "db" "zitadel" "caddy"; do
        if [[ " ${failed_services[*]} " =~ " $service " ]]; then
            restart_service "$service"

            # Verify the restart worked
            sleep 10
            if check_service_health "$service"; then
                log "✅ $service service recovery successful"
            else
                log "❌ $service service recovery failed"
            fi
        fi
    done

    log "🏁 Service recovery check completed"
}

# Create log file if it doesn't exist
touch "$LOG_FILE"

# Run the main function
main