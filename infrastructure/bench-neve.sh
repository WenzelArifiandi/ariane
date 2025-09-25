#!/usr/bin/env bash
# bench-neve-summary.sh
# Usage: ./bench-neve-summary.sh [TARGET] [RUNS]
# Example: ./bench-neve-summary.sh neve.wenzelarifiandi.com 5

set -euo pipefail

TARGET="${1:-neve.wenzelarifiandi.com}"
RUNS="${2:-5}"

# prefer Homebrew curl if present (has HTTP/3)
if [[ -x "/opt/homebrew/opt/curl/bin/curl" ]]; then
  CURL="/opt/homebrew/opt/curl/bin/curl"
elif [[ -x "/usr/local/opt/curl/bin/curl" ]]; then
  CURL="/usr/local/opt/curl/bin/curl"
else
  CURL="$(command -v curl || true)"
fi

if [[ -z "$CURL" ]]; then
  echo "curl not found on PATH. Install curl with HTTP/3 support (Homebrew on macOS recommended)."
  exit 1
fi

echo "Target: $TARGET  Runs: $RUNS  curl: $CURL"
tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"' EXIT

# Format: dns connect tls start total (space-separated)
FMT="%{time_namelookup} %{time_connect} %{time_appconnect} %{time_starttransfer} %{time_total}\n"

run_curl_many() {
  local mode="$1"      # "http3" or "http2"
  local out="$2"
  echo "→ Running $mode x $RUNS"
  >"$out"
  for i in $(seq 1 "$RUNS"); do
    if [[ "$mode" == "http3" ]]; then
      # --http3-only ensures QUIC is used by curl (needs libngtcp2/nghttp3 enabled curl)
      # fallback: if --http3-only not supported by this curl, try --http3 (or just let curl pick)
      if "$CURL" --help 2>&1 | grep -q -- "--http3-only"; then
        line="$("$CURL" --http3-only -s -o /dev/null -w "$FMT" "https://$TARGET/" 2>/dev/null || true)"
      elif "$CURL" --help 2>&1 | grep -q -- "--http3"; then
        line="$("$CURL" --http3 -s -o /dev/null -w "$FMT" "https://$TARGET/" 2>/dev/null || true)"
      else
        # last resort: let curl negotiate (may use h2)
        line="$("$CURL" -s -o /dev/null -w "$FMT" "https://$TARGET/" 2>/dev/null || true)"
      fi
    else
      # HTTP/2: use --http2 (may be required to force HTTP/2)
      if "$CURL" --help 2>&1 | grep -q -- "--http2"; then
        line="$("$CURL" --http2 -s -o /dev/null -w "$FMT" "https://$TARGET/" 2>/dev/null || true)"
      else
        line="$("$CURL" -s -o /dev/null -w "$FMT" "https://$TARGET/" 2>/dev/null || true)"
      fi
    fi

    # if curl returned nothing, record zeros and warn
    if [[ -z "$line" ]]; then
      echo "0 0 0 0 0" >>"$out"
      echo "  (run $i) curl returned no timing output"
    else
      # normalize multiple spaces, keep 5 columns
      echo "$line" | awk '{printf "%0.6f %0.6f %0.6f %0.6f %0.6f\n", $1,$2,$3,$4,$5}' >>"$out"
    fi
    sleep 0.2
  done
}

stats_onecol() {
  # compute min/avg/max from a file column (1-indexed)
  local file="$1"
  local col="$2"
  awk -v c="$col" 'BEGIN {min=1e99; sum=0; n=0}
    { v = $c + 0; if(v < min) min=v; if(v>max) max=v; sum+=v; n++ }
    END { if(n==0){print "0 0 0"; exit} printf "%.6f %.6f %.6f\n", min, sum/n, max }' "$file"
}

# run HTTP/3 and HTTP/2
H3_FILE="$tmpdir/h3.txt"
H2_FILE="$tmpdir/h2.txt"

run_curl_many http3 "$H3_FILE"
run_curl_many http2 "$H2_FILE"

# print compact summaries
echo
echo "=== Results (min / avg / max) per metric (seconds) ==="
printf "%-8s %-10s %-10s %-10s %-10s %-10s\n" "Proto" "connect" "tls" "start" "total" "dns"
for proto in "HTTP/3" "HTTP/2"; do
  if [[ "$proto" == "HTTP/3" ]]; then file="$H3_FILE"; else file="$H2_FILE"; fi
  # columns in file: 1=dns 2=connect 3=tls 4=start 5=total
  c_conn=2; c_tls=3; c_start=4; c_total=5; c_dns=1
  read conn_min conn_avg conn_max < <(stats_onecol "$file" $c_conn)
  read tls_min tls_avg tls_max < <(stats_onecol "$file" $c_tls)
  read st_min st_avg st_max < <(stats_onecol "$file" $c_start)
  read tot_min tot_avg tot_max < <(stats_onecol "$file" $c_total)
  read dns_min dns_avg dns_max < <(stats_onecol "$file" $c_dns)
  printf "%-8s %-10s %-10s %-10s %-10s %-10s\n" \
    "$proto" \
    "$(printf "%.3f/%.3f/%.3f" $conn_min $conn_avg $conn_max)" \
    "$(printf "%.3f/%.3f/%.3f" $tls_min $tls_avg $tls_max)" \
    "$(printf "%.3f/%.3f/%.3f" $st_min $st_avg $st_max)" \
    "$(printf "%.3f/%.3f/%.3f" $tot_min $tot_avg $tot_max)" \
    "$(printf "%.3f/%.3f/%.3f" $dns_min $dns_avg $dns_max)"
done

echo
# Try nping for TCP/UDP RTT if available
if command -v nping >/dev/null 2>&1; then
  echo "=== nping (RTT) ==="
  # try UDP: may need sudo to get correct source port; try non-sudo first
  if nping --version >/dev/null 2>&1; then
    echo "-> TCP (SYN) RTT :443 (5 probes)"
    if nping --tcp -c 5 -p 443 "$TARGET" 2>&1 | tee "$tmpdir/nping-tcp.out"; then
      awk '/Avg rtt/ {print "TCP RTT line: " $0}' "$tmpdir/nping-tcp.out" || true
    else
      echo "nping TCP probe failed or requires privileges; skipping."
    fi

    echo "-> UDP RTT :443 (5 probes)"
    # UDP may need raw sockets (root). Try non-root first, fall back to sudo if available.
    if nping --udp -c 5 -p 443 "$TARGET" 2>&1 | tee "$tmpdir/nping-udp.out"; then
      awk '/Avg rtt/ {print "UDP RTT line: " $0}' "$tmpdir/nping-udp.out" || true
    else
      if command -v sudo >/dev/null 2>&1; then
        echo "nping UDP needed root — trying with sudo (you may be prompted for password)..."
        if sudo nping --udp -c 5 -p 443 "$TARGET" 2>&1 | tee "$tmpdir/nping-udp.out"; then
          awk '/Avg rtt/ {print "UDP RTT line: " $0}' "$tmpdir/nping-udp.out" || true
        else
          echo "sudo nping UDP failed or was not allowed."
        fi
      else
        echo "sudo not found; cannot run privileged UDP nping."
      fi
    fi
  fi
else
  echo "(nping not installed — skipping low-level UDP RTT probe; install nmap/nping if you want this)"
fi

echo
# Try httping if present for short HTTP connect times
if command -v httping >/dev/null 2>&1; then
  echo "=== httping (TLS) 5 probes ==="
  httping -G -c 5 -l "https://$TARGET/" || true
else
  echo "(httping not installed — skipping)"
fi

echo
echo "Done. Raw per-run CSV files:"
echo "  $H3_FILE  (dns connect tls start total)"
echo "  $H2_FILE  (dns connect tls start total)"