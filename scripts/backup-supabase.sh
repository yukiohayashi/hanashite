#!/bin/bash

# Supabaseデータベースバックアップスクリプト
# 使用方法: ./scripts/backup-supabase.sh

# 設定
CONTAINER_NAME="supabase_db_anke-nextjs"
DB_USER="postgres"
DB_NAME="postgres"
BACKUP_DIR="./backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/supabase_backup_${DATE}.sql.gz"

# バックアップディレクトリを作成
mkdir -p ${BACKUP_DIR}

# バックアップ実行
echo "バックアップを開始します..."
echo "コンテナ: ${CONTAINER_NAME}"
echo "データベース: ${DB_NAME}"
echo "保存先: ${BACKUP_FILE}"

docker exec ${CONTAINER_NAME} pg_dump -U ${DB_USER} -d ${DB_NAME} | gzip > ${BACKUP_FILE}

if [ $? -eq 0 ]; then
    echo "✅ バックアップが完了しました: ${BACKUP_FILE}"
    
    # ファイルサイズを表示
    SIZE=$(du -h ${BACKUP_FILE} | cut -f1)
    echo "ファイルサイズ: ${SIZE}"
    
    # 古いバックアップを削除（30日以上前のもの）
    echo "古いバックアップを削除しています..."
    find ${BACKUP_DIR} -name "supabase_backup_*.sql.gz" -mtime +30 -delete
    
    # 残っているバックアップファイル数を表示
    BACKUP_COUNT=$(ls -1 ${BACKUP_DIR}/supabase_backup_*.sql.gz 2>/dev/null | wc -l)
    echo "保存されているバックアップ数: ${BACKUP_COUNT}"
else
    echo "❌ バックアップに失敗しました"
    exit 1
fi
