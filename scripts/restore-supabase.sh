#!/bin/bash

# Supabaseデータベースリストアスクリプト
# 使用方法: ./scripts/restore-supabase.sh <バックアップファイル>

# 設定
CONTAINER_NAME="supabase_db_anke-nextjs"
DB_USER="postgres"
DB_NAME="postgres"

# 引数チェック
if [ $# -eq 0 ]; then
    echo "使用方法: $0 <バックアップファイル>"
    echo "例: $0 ./backups/supabase_backup_20260109_120000.sql.gz"
    exit 1
fi

BACKUP_FILE=$1

# ファイル存在チェック
if [ ! -f "${BACKUP_FILE}" ]; then
    echo "❌ エラー: バックアップファイルが見つかりません: ${BACKUP_FILE}"
    exit 1
fi

echo "⚠️  警告: このスクリプトは既存のデータベースを上書きします"
echo "バックアップファイル: ${BACKUP_FILE}"
echo "コンテナ: ${CONTAINER_NAME}"
echo "データベース: ${DB_NAME}"
echo ""
read -p "続行しますか? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "キャンセルしました"
    exit 0
fi

echo "リストアを開始します..."

# データベースを削除して再作成
echo "既存のデータベースを削除しています..."
docker exec ${CONTAINER_NAME} psql -U ${DB_USER} -c "DROP DATABASE IF EXISTS ${DB_NAME};"
docker exec ${CONTAINER_NAME} psql -U ${DB_USER} -c "CREATE DATABASE ${DB_NAME};"

# バックアップをリストア
echo "バックアップをリストアしています..."
if [[ ${BACKUP_FILE} == *.gz ]]; then
    # gzip圧縮ファイルの場合
    gunzip -c ${BACKUP_FILE} | docker exec -i ${CONTAINER_NAME} psql -U ${DB_USER} -d ${DB_NAME}
else
    # 非圧縮ファイルの場合
    cat ${BACKUP_FILE} | docker exec -i ${CONTAINER_NAME} psql -U ${DB_USER} -d ${DB_NAME}
fi

if [ $? -eq 0 ]; then
    echo "✅ リストアが完了しました"
    
    # テーブル数を確認
    TABLE_COUNT=$(docker exec ${CONTAINER_NAME} psql -U ${DB_USER} -d ${DB_NAME} -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")
    echo "リストアされたテーブル数: ${TABLE_COUNT}"
else
    echo "❌ リストアに失敗しました"
    exit 1
fi
