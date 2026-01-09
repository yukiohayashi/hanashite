#!/bin/bash

# AI自動投稿生成 CRON実行スクリプト
# VPSのcrontabから定期実行されます

# スクリプトのディレクトリを取得
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 環境変数を読み込み
if [ -f "${SCRIPT_DIR}/.env.cron" ]; then
    source "${SCRIPT_DIR}/.env.cron"
else
    echo "Error: .env.cron file not found"
    exit 1
fi

# ログディレクトリを作成
mkdir -p "${LOG_DIR}"

# ログファイル
LOG_FILE="${LOG_DIR}/auto-creator.log"
ERROR_LOG="${LOG_DIR}/auto-creator-error.log"

# タイムスタンプ
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# ログ出力開始
echo "[$TIMESTAMP] AI自動投稿生成 CRON実行開始" >> "$LOG_FILE"

# API呼び出し
RESPONSE=$(curl -s -X POST "${API_URL}/api/cron/auto-creator" \
  -H "Content-Type: application/json" \
  -H "x-api-secret: ${API_SECRET}" \
  -w "\nHTTP_STATUS:%{http_code}")

# HTTPステータスコードを抽出
HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')

# 結果をログに記録
if [ "$HTTP_STATUS" = "200" ]; then
    echo "[$TIMESTAMP] 成功: $BODY" >> "$LOG_FILE"
else
    echo "[$TIMESTAMP] エラー (HTTP $HTTP_STATUS): $BODY" >> "$ERROR_LOG"
fi

echo "[$TIMESTAMP] AI自動投稿生成 CRON実行完了" >> "$LOG_FILE"
