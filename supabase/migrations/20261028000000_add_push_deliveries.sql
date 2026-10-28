-- 逐台記錄每一次推播的結果（見 docs/05-decisions/ADR-008-push-delivery-log.md）。
--
-- 原本只在 reminder_schedules.last_sent_on 記一個「今天已發送」，無法回答兩個問題：
--   1. 同一則提醒有兩台裝置時，哪一台成功、哪一台失敗？失敗的那台要不要重試？
--   2. 推播服務（Apple / Google）收下之後，手機到底有沒有真的收到？
-- 這張表一列代表「某則提醒、某一天、某一台裝置」的一次投遞，狀態會隨重試更新；
-- 測試通知（kind = 'TEST'）每按一次就新增一列，不受唯一索引限制。
--
-- 三層狀態對應三種排查結論：
--   status = FAILED / EXPIRED     → 推播服務拒收，status_code / error_message 說明原因
--   status = DELIVERED、received_at 為空 → 推播服務收下了，但手機的 Service Worker 沒有回報收到
--   received_at 有值              → 手機收到並已呼叫顯示通知；仍看不到通常是系統通知設定或專注模式

create table if not exists push_deliveries (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('REMINDER', 'TEST')),
  user_id uuid not null references auth.users (id) on delete cascade,
  -- 訂閱被刪除（失效或使用者關閉推播）後保留紀錄供排查，所以是 set null 而不是 cascade
  subscription_id uuid references push_subscriptions (id) on delete set null,
  reminder_id uuid references reminder_schedules (id) on delete cascade,
  -- Asia/Taipei 的日期，跟 cron 判斷「今天」用同一個基準
  sent_on date not null,
  status text not null check (status in ('SENDING', 'DELIVERED', 'FAILED', 'EXPIRED')),
  attempt_count integer not null default 1 check (attempt_count >= 1),
  status_code integer,
  -- 推播服務回傳的原因（例如 Apple 的 {"reason":"BadDeviceToken"}），截斷在 300 字以內
  error_message text check (error_message is null or char_length(error_message) <= 300),
  -- 只存主機名稱（例如 web.push.apple.com），不存完整 endpoint：完整網址等同推播憑證
  endpoint_host text,
  -- 訂閱建立時間，讓使用者在紀錄裡分辨是哪一台裝置
  subscription_created_at timestamptz,
  received_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- 提醒一定要對應到一則排程（排程被刪除時整列跟著 cascade 刪掉）；測試通知一定沒有排程
  check ((kind = 'REMINDER') = (reminder_id is not null))
);

-- 同一則提醒、同一台裝置、同一天只有一列：cron 用 insert ... on conflict do nothing 搶這一列，
-- 搶到的那次才發送，取代原本「先查 last_sent_on 再寫入」的非原子判斷，
-- 兩次 cron 觸發重疊時也不會重複推播。
-- 刻意不用部分索引（where kind = 'REMINDER'）：PostgREST 的 on_conflict 無法帶 WHERE 條件，
-- 對不到部分索引。測試通知的 reminder_id 是 null，而 null 在唯一約束裡彼此不相等，不會互相衝突
alter table push_deliveries
  add constraint push_deliveries_reminder_device_day_key
  unique (reminder_id, subscription_id, sent_on);

create index if not exists push_deliveries_user_created_idx
  on push_deliveries (user_id, created_at desc);

create index if not exists push_deliveries_created_idx on push_deliveries (created_at);

alter table push_deliveries enable row level security;

-- 使用者只能看自己的投遞紀錄（通知中心的「最近推播紀錄」）；寫入一律由 service_role 處理
create policy "Users can view their own push deliveries"
  on push_deliveries
  for select
  using (user_id = auth.uid());

grant select on table push_deliveries to authenticated;
grant select, insert, update, delete on table push_deliveries to service_role;
