-- サイト基本設定テーブル
create table public.site_settings (
  id bigserial primary key,
  setting_key varchar(100) unique not null,
  setting_value text,
  setting_type varchar(50) default 'text',
  description text,
  updated_at timestamp with time zone default now(),
  updated_by text references users(id)
);



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
