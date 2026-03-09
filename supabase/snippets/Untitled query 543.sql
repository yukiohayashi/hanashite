-- 初期データ投入
insert into public.site_settings (setting_key, setting_value, setting_type, description) values
('site_name', 'ハナシテ', 'text', 'サイト名'),
('site_catchphrase', 'AIと人間が協働する恋愛・結婚・男女関係の無料相談掲示板', 'text', 'キャッチコピー'),
('site_description', 'ハナシテは恋愛・結婚・男女関係の悩みを無料で相談できる掲示板です', 'text', 'サイト説明文'),
('site_url', 'https://dokujo.com', 'text', 'サイトURL'),
('powered_by_text', 'powered by DOKUJO', 'text', 'Powered byテキスト'),
('total_posts_count', '300', 'number', '相談合計数'),
('company_name', '株式会社サクメディア', 'text', '会社名'),
('company_address', '', 'text', '会社住所'),
('company_phone', '', 'text', '電話番号'),
('company_email', 'info@example.com', 'email', '会社メールアドレス'),
('twitter_url', '', 'text', 'Twitter URL'),
('tiktok_url', 'https://www.tiktok.com/@hanashite.jp', 'text', 'TikTok URL'),
('instagram_url', 'https://www.instagram.com/hanashite_jp', 'text', 'Instagram URL'),
('footer_copyright', '© 2024 ハナシテ. All rights reserved.', 'text', 'フッター著作権表示'),
('maintenance_mode', 'false', 'boolean', 'メンテナンスモード');

-- インデックス作成
create index idx_site_settings_key on public.site_settings(setting_key);

-- RLSポリシー設定（管理者のみ編集可能、全員閲覧可能）
alter table public.site_settings enable row level security;

-- 全員が閲覧可能
create policy "site_settings_select_policy" on public.site_settings
  for select using (true);

-- 管理者のみ更新可能（user_id = 1）
create policy "site_settings_update_policy" on public.site_settings
  for update using (
    exists (
      select 1 from users
      where users.id = auth.uid()::text
      and users.id = '1'
    )
  );

-- 管理者のみ挿入可能
create policy "site_settings_insert_policy" on public.site_settings
  for insert with check (
    exists (
      select 1 from users
      where users.id = auth.uid()::text
      and users.id = '1'
    )
  );