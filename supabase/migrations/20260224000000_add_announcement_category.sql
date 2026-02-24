-- 運営からのお知らせカテゴリを追加
INSERT INTO categories (name, slug, description, display_order, is_active, is_featured)
VALUES ('運営からのお知らせ', 'announcement', '運営からの重要なお知らせや更新情報', 0, true, true)
ON CONFLICT (slug) DO NOTHING;
