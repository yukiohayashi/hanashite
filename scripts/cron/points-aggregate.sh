#!/bin/bash

# ポイント集計 CRON実行スクリプト
# VPSのcrontabから定期実行されます

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ -f "${SCRIPT_DIR}/.env.cron" ]; then
    source "${SCRIPT_DIR}/.env.cron"
else
    echo "Error: .env.cron file not found"
    exit 1
fi

mkdir -p "${LOG_DIR}"

LOG_FILE="${LOG_DIR}/points-aggregate.log"
ERROR_LOG="${LOG_DIR}/points-aggregate-error.log"

TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

echo "[$TIMESTAMP] ポイント集計 CRON実行開始" >> "$LOG_FILE"

RESPONSE=$(curl -s -X POST "${API_URL}/api/cron/points-aggregate" \
  -H "Content-Type: application/json" \
  -H "x-api-secret: ${API_SECRET}" \
  -w "\nHTTP_STATUS:%{http_code}")

HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" = "200" ]; then
    echo "[$TIMESTAMP] 成功: $BODY" >> "$LOG_FILE"
else
    echo "[$TIMESTAMP] エラー (HTTP $HTTP_STATUS): $BODY" >> "$ERROR_LOG"
fi

echo "[$TIMESTAMP] ポイント集計 CRON実行完了" >> "$LOG_FILE"
