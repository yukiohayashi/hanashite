-- 未使用のnotificationsテーブルを削除
-- 現在のシステムは通知を動的に生成し、既読状態のみnotification_readsテーブルで管理している

drop table if exists public.notifications cascade;
