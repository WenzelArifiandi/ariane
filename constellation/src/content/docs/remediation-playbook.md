---
title: ZITADEL Docker Remediation Quick Commands
description: "# ZITADEL Docker Remediation Quick Commands"
slug: "remediation-playbook"
---

# ZITADEL Docker Remediation Quick Commands

Copy/paste friendly sequence. Run from `~/zitadel` on the Oracle host.

```bash
set -euo pipefail

echo '=== BASELINE ==='
docker compose version || docker-compose version || true
docker version | grep -E 'Version|Server'

echo '=== TRIAGE COLLECTION ==='
bash scripts/triage.sh || echo 'triage script failed but continuing'

echo '=== STOP STACK (IGNORE ERRORS) ==='
docker compose down --remove-orphans || true

echo '=== REMOVE STRAGGLERS ==='
docker ps -a --format '{{.ID}} {{.Names}}' | grep -E 'zitadel|caddy|postgres|db' | awk '{print $1}' | xargs -r docker rm -f || true

echo '=== OPTIONAL PRUNE (comment out to skip) ==='
# docker system prune -f

echo '=== ENGINE RESTART (if previous run hit KeyError) ==='
# sudo systemctl restart docker

echo '=== START DB FIRST ==='
docker compose up -d db
echo 'Waiting for Postgres readiness...'
ATTEMPTS=40
until docker compose logs db | grep -q 'database system is ready'; do
  ((ATTEMPTS--)) || { echo 'Postgres not ready in time'; exit 1; }
  sleep 2
done

echo '=== START ZITADEL (healthcheck removed or fixed) ==='
docker compose up -d zitadel
sleep 5
docker compose logs --tail=120 zitadel

echo '=== START CADDY ==='
docker compose up -d caddy
sleep 3
docker compose ps

echo '=== BASIC ENDPOINT CHECK (local container network) ==='
curl -fk https://auth.wenzelarifiandi.com/.well-known/openid-configuration | head -c 400 || echo 'endpoint check failed (may rely on DNS / external routing)'

echo '=== SMTP LOG SCAN ==='
docker compose logs zitadel | grep -i smtp | tail -n 10 || echo 'No SMTP lines (may be fine)'

echo '=== DONE ==='
```

## Notes

- Comment/uncomment prune and restart lines based on severity.
- If `KeyError: 'ContainerConfig'` reappears immediately after `down`, perform engine restart and re-run from DB start section.
- For persistent corruption with acceptable data loss risk, take a `pg_dump` first, then rebuild Docker metadata (see README hard reset section).
