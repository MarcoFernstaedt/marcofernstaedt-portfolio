#!/usr/bin/env bash
set -euo pipefail
if curl -fsS --max-time 5 http://127.0.0.1:3025/health >/dev/null 2>&1; then
  exit 0
fi
nohup /home/marco/.hermes/scripts/visitor_log_collector.py --host 127.0.0.1 --port 3025 >/home/marco/.hermes/visitor-analytics/collector.log 2>&1 &
sleep 1
curl -fsS --max-time 5 http://127.0.0.1:3025/health >/dev/null
