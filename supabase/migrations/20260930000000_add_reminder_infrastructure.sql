-- 主動提醒排程（見 docs/01-requirements/notification.md）：
-- reminder_schedules 記錄「這隻貓什麼時候該做什麼」，push_subscriptions 記錄「這個使用者
-- 的哪個裝置訂閱了推播」。兩張表的存取模式完全不同：前者是貓的共用設定（owner 管理、
-- 協作者唯讀，跟 cat_profiles 同一套權限心智模型），後者是個人裝置資料，任何情況下都
-- 只屬於使用者自己，不會、也不應該讓其他人（即使是同一隻貓的協作者）看到或動到。

create table if not exists reminder_schedules (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references cat_profiles (id) on delete cascade,
  type text not null check (type in ('FLUID', 'MEDICATION', 'DAILY_LOG')),
  label text not null check (char_length(label) between 1 and 20),
  -- 本地時間 HH:mm，MVP 只支援 Asia/Taipei 單一時區，不做使用者裝置時區偵測
  time_of_day text not null check (time_of_day ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists reminder_schedules_pet_id_idx on reminder_schedules (pet_id);

alter table reminder_schedules enable row level security;

-- 跟 owns_cat_profile 用同一種手法：另外開一個 security definer 函式判斷「是不是這隻貓的
-- accepted 協作者」，避免 reminder_schedules 的政策直接查 pet_caregivers 導致跨表 RLS
-- 互相查對方的循環（這個專案已經在 cat_profiles/pet_caregivers 踩過一次一模一樣的坑）。
-- 這裡刻意只認 ACCEPTED（不像 cat_profiles 的 is_invited_caregiver 連 PENDING 都算），
-- 因為還沒接受邀請的人不需要看到這隻貓的提醒排程。
create or replace function is_accepted_caregiver(check_pet_id uuid, check_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from pet_caregivers
    where pet_caregivers.pet_id = check_pet_id
      and pet_caregivers.user_id = check_user_id
      and pet_caregivers.status = 'ACCEPTED'
  );
$$;

revoke all on function is_accepted_caregiver(uuid, uuid) from public;
grant execute on function is_accepted_caregiver(uuid, uuid) to authenticated, service_role;

create policy "Owners can manage reminder schedules for their own cats"
  on reminder_schedules
  for all
  using (owns_cat_profile(reminder_schedules.pet_id, auth.uid()))
  with check (owns_cat_profile(reminder_schedules.pet_id, auth.uid()));

create policy "Accepted caregivers can view reminder schedules"
  on reminder_schedules
  for select
  using (is_accepted_caregiver(reminder_schedules.pet_id, auth.uid()));

grant select, insert, update, delete on table reminder_schedules to authenticated;
grant select, insert, update, delete on table reminder_schedules to service_role;

-- 瀏覽器 Push 訂閱：純粹是「這個使用者的這個裝置」的憑證，一律只有本人能讀寫，
-- 不透過 cat_profiles/pet_caregivers 判斷任何權限
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_id_idx on push_subscriptions (user_id);

alter table push_subscriptions enable row level security;

create policy "Users can manage their own push subscriptions"
  on push_subscriptions
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select, insert, update, delete on table push_subscriptions to authenticated;
grant select, insert, update, delete on table push_subscriptions to service_role;
