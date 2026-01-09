#!/usr/bin/env python3
import csv
import re
import psycopg2

# データベース接続
conn = psycopg2.connect(
    host="localhost",
    port="54322",
    database="postgres",
    user="postgres",
    password="postgres"
)
cur = conn.cursor()

# CSVファイルを読み込む
csv_file = '/Users/yukki/htdocs/kusanagi_html_anke/anke_db/wp_anke_posts.csv'

# カテゴリIDを抽出する関数
def extract_category_id(ai_tagger_result):
    if not ai_tagger_result or ai_tagger_result == 'NULL':
        return None
    
    # パターン: s:2:"id";i:数字;
    match = re.search(r's:2:"id";i:(\d+);', ai_tagger_result)
    if match:
        return int(match.group(1))
    
    return None

# CSVを読み込んで処理
updated_count = 0
skipped_count = 0

with open(csv_file, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f, delimiter=';')
    
    for row in reader:
        post_id = row.get('post_id')
        ai_tagger_result = row.get('ai_tagger_result')
        
        if not post_id:
            continue
        
        # カテゴリIDを抽出
        category_id = extract_category_id(ai_tagger_result)
        
        if category_id:
            # postsテーブルを更新（category_idが未設定の場合のみ）
            cur.execute("""
                UPDATE posts 
                SET category_id = %s 
                WHERE id = %s AND category_id IS NULL
            """, (category_id, int(post_id)))
            
            if cur.rowcount > 0:
                updated_count += 1
                if updated_count % 100 == 0:
                    print(f'進捗: {updated_count}件更新済み')
                    conn.commit()
        else:
            skipped_count += 1

# 最終コミット
conn.commit()

print(f'\n完了！')
print(f'更新: {updated_count}件')
print(f'スキップ: {skipped_count}件')

# 統計を表示
cur.execute("SELECT COUNT(*) FROM posts WHERE category_id IS NOT NULL")
total_with_category = cur.fetchone()[0]
print(f'カテゴリID設定済み投稿: {total_with_category}件')

cur.close()
conn.close()
