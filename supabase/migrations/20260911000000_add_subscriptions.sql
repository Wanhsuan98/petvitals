-- 訂閱狀態表：對應綠界 (ECPay) 信用卡定期定額訂單。
-- 寫入只會發生在兩個地方：
-- 1. 使用者建立訂閱時（Server Action，用使用者自己的 session，走 RLS）
-- 2. 綠界 webhook 回報付款結果時（沒有使用者 session，改用 service_role 略過 RLS，
--    安全性由 CheckMacValue 驗證取代，不依賴 RLS）
create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  merchant_trade_no text not null unique,
  status text not null default 'pending'
    check (status in ('pending', 'active', 'cancelled', 'failed')),
  period_amount numeric not null,
  period_type text not null check (period_type in ('D', 'M', 'Y')),
  frequency int not null,
  exec_times int not null,
  total_success_times int not null default 0,
  last_paid_at timestamptz,
  -- 該筆授權的唯一識別（首次付款為 TradeNo，第二次起為 Gwsr），
  -- 用來判斷 webhook 是否為重複通知，避免重複計入成功次數
  last_auth_ref text,
  created_at timestamptz not null default now()
);

create index if not exists subscriptions_owner_id_idx on subscriptions (owner_id);

alter table subscriptions enable row level security;

-- 使用者只能看到、建立自己的訂閱；更新/取消一律透過 Server Action 或 webhook（service_role）處理，
-- 不開放使用者直接改自己的訂閱狀態（避免自己把 status 改成 active 卻沒真的付款）
create policy "Owners can view their own subscriptions"
  on subscriptions
  for select
  using (owner_id = auth.uid());

create policy "Owners can create their own pending subscriptions"
  on subscriptions
  for insert
  with check (owner_id = auth.uid() and status = 'pending');

grant select, insert on table subscriptions to authenticated;
