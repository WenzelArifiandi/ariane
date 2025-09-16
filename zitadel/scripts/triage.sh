#!/usr/bin/env bash
set -euo pipefail

# ZITADEL Docker stack triage script
# Collects baseline diagnostics without making destructive changes.
# Usage: bash triage.sh (run from zitadel/ directory containing docker-compose.yml)

OUT_DIR=${OUT_DIR:-triage-$(date +%Y%m%d-%H%M%S)}
mkdir -p "$OUT_DIR"
log() { printf "[triage] %s\n" "$*"; }
run() { log "$*"; bash -c "$*" 2>&1 | tee -a "$OUT_DIR/commands.log"; }

log "Output dir: $OUT_DIR"

# 1. Versions
(run 'docker version' || true) > "$OUT_DIR/docker-version.txt" 2>&1
(run 'docker compose version' || true) > "$OUT_DIR/docker-compose-version.txt" 2>&1
(which docker-compose && docker-compose version || true) > "$OUT_DIR/docker-compose-legacy.txt" 2>&1 || true

# 2. Compose rendered config
(run 'docker compose config') > "$OUT_DIR/compose-config.txt" 2>&1 || true

# 3. Container list / status
(run 'docker ps -a --no-trunc') > "$OUT_DIR/ps-a.txt" 2>&1 || true

# 4. Existing zitadel related containers / images / volumes / networks
for kind in container image volume network; do
  docker ${kind} ls 2>/dev/null | grep -i zitadel || true >> "$OUT_DIR/${kind}-zitadel.txt" 2>&1 || true
  docker ${kind} ls 2>/dev/null | grep -i caddy || true >> "$OUT_DIR/${kind}-zitadel.txt" 2>&1 || true
  docker ${kind} ls 2>/dev/null | grep -i postgres || true >> "$OUT_DIR/${kind}-zitadel.txt" 2>&1 || true
done

# 5. Logs (tail) for services if present
for svc in zitadel db caddy; do
  if docker ps --format '{{.Names}}' | grep -q "$svc"; then
    docker logs --tail=300 "$svc" > "$OUT_DIR/log-$svc.txt" 2>&1 || true
  else
    # Try compose project prefix pattern
    cname=$(docker ps --format '{{.Names}}' | grep -E "_${svc}_1$" || true)
    if [[ -n "$cname" ]]; then
      docker logs --tail=300 "$cname" > "$OUT_DIR/log-$svc.txt" 2>&1 || true
    fi
  fi
done

# 6. Inspect metadata for zitadel + db
for name in zitadel db; do
  ref=$(docker ps -a --format '{{.Names}}' | grep -E "(^|_)${name}(_1)?$" | head -n1 || true)
  if [[ -n "$ref" ]]; then
    docker inspect "$ref" > "$OUT_DIR/inspect-${name}.json" 2>&1 || true
  fi
done

# 7. Check healthcheck command currently configured (from compose file)
grep -n 'healthcheck' -n ../docker-compose.yml > "$OUT_DIR/compose-healthcheck-snippet.txt" 2>&1 || true
awk '/zitadel:/,/^\S/' ../docker-compose.yml > "$OUT_DIR/compose-zitadel-block.txt" 2>&1 || true

# 8. Hash of config file to confirm mount parity
sha256sum ../zitadel.yaml > "$OUT_DIR/zitadel-yaml.sha256" 2>&1 || true

# 9. Disk usage quick glance
(df -h && docker system df) > "$OUT_DIR/disk-usage.txt" 2>&1 || true

# 10. Verify commands availability inside running zitadel container (wget/curl)
if docker ps --format '{{.Names}}' | grep -q 'zitadel'; then
  cid=$(docker ps --format '{{.ID}} {{.Names}}' | awk '/zitadel/{print $1; exit}')
  docker exec "$cid" sh -c 'command -v wget || echo wget-missing' > "$OUT_DIR/in-container-tools.txt" 2>&1 || true
  docker exec "$cid" sh -c 'command -v curl || echo curl-missing' >> "$OUT_DIR/in-container-tools.txt" 2>&1 || true
fi

log "Collected diagnostics in $OUT_DIR" 
log "Tarballing..."
(tar -czf "$OUT_DIR.tar.gz" "$OUT_DIR") 2>/dev/null || true
log "Done. Review $OUT_DIR/ or attach $OUT_DIR.tar.gz for analysis." 
