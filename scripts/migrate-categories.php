<?php
/**
 * WordPressのwp_anke_post_categoriesからNext.jsのpostsテーブルにカテゴリを移行
 */

// WordPress DB接続
$wpdb = new PDO(
    'mysql:host=127.0.0.1;port=3306;dbname=anke_db',
    'root',
    'rootpass',
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
);

// Supabase (PostgreSQL) DB接続
$supabase = new PDO(
    'pgsql:host=127.0.0.1;port=54322;dbname=postgres',
    'postgres',
    'postgres',
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
);

echo "カテゴリ移行を開始します...\n";

// 1. Next.jsの既存category_idをクリア
echo "既存のカテゴリ割り当てをクリアしています...\n";
$supabase->exec("UPDATE posts SET category_id = NULL");
echo "クリア完了\n";

// 2. WordPressからカテゴリデータを取得
echo "WordPressからカテゴリデータを取得しています...\n";
$stmt = $wpdb->query("
    SELECT post_id, category_id
    FROM wp_anke_post_categories
    ORDER BY post_id
");
$categories = $stmt->fetchAll(PDO::FETCH_ASSOC);
echo "取得件数: " . count($categories) . "件\n";

// 3. Next.jsに一括更新
echo "Next.jsのpostsテーブルを更新しています...\n";
$updateStmt = $supabase->prepare("
    UPDATE posts 
    SET category_id = :category_id 
    WHERE id = :post_id
");

$updated = 0;
$notFound = 0;

foreach ($categories as $index => $row) {
    try {
        $updateStmt->execute([
            ':post_id' => $row['post_id'],
            ':category_id' => $row['category_id']
        ]);
        
        if ($updateStmt->rowCount() > 0) {
            $updated++;
        } else {
            $notFound++;
        }
        
        // 進捗表示
        if (($index + 1) % 1000 == 0) {
            echo "処理中: " . ($index + 1) . " / " . count($categories) . "\n";
        }
    } catch (Exception $e) {
        echo "エラー (post_id: {$row['post_id']}): " . $e->getMessage() . "\n";
    }
}

echo "\n移行完了！\n";
echo "更新件数: {$updated}件\n";
echo "投稿が見つからなかった件数: {$notFound}件\n";

// 4. 結果を確認
echo "\nカテゴリごとの投稿数を確認しています...\n";
$result = $supabase->query("
    SELECT category_id, COUNT(*) as count
    FROM posts
    WHERE category_id IS NOT NULL AND status IN ('publish', 'published')
    GROUP BY category_id
    ORDER BY count DESC
");

echo "\nカテゴリID | 投稿数\n";
echo "----------+-------\n";
foreach ($result as $row) {
    echo sprintf("%9d | %6d\n", $row['category_id'], $row['count']);
}

echo "\n完了しました！\n";
