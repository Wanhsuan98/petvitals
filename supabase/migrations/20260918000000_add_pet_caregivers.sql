-- 多照護者協作（訂閱 Pro 進階功能）：一隻貓的 owner 可以邀請其他帳號成為協作者，
-- 共同讀寫該貓的 daily_care_logs / blood_tests。
--
-- 這張表只記錄「被邀請的協作者」，不記錄 owner 自己——owner 的權限本來就來自
-- cat_profiles.owner_id，不需要在這裡再存一筆多餘、還要顧慮權限升級風險的 OWNER 資料列。
-- 人數上限（含 owner 共 3 人）在應用層檢查（owner 隱含 1 人 + 這張表 accepted 筆數），
-- 這裡不做 DB constraint。
create table if not exists pet_caregivers (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references cat_profiles (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'PENDING' check (status in ('PENDING', 'ACCEPTED')),
  invited_email text not null,
  invited_at timestamptz not null default now(),
  accepted_at timestamptz,
  unique (pet_id, user_id)
);

create index if not exists pet_caregivers_pet_id_idx on pet_caregivers (pet_id);
create index if not exists pet_caregivers_user_id_idx on pet_caregivers (user_id);

alter table pet_caregivers enable row level security;

-- owner 的管理權：邀請、移除、查看名單。owner 身分一律用 cat_profiles.owner_id 比對，
-- 不透過這張表自己的欄位判斷（這張表根本不存 owner 的資料列）。
create policy "Owners can manage caregivers for their own cats"
  on pet_caregivers
  for all
  using (
    exists (
      select 1 from cat_profiles
      where cat_profiles.id = pet_caregivers.pet_id
        and cat_profiles.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from cat_profiles
      where cat_profiles.id = pet_caregivers.pet_id
        and cat_profiles.owner_id = auth.uid()
    )
  );

-- 被邀請者要能看到「自己」的邀請紀錄才能決定要不要接受。
-- 這裡用直接欄位比對（user_id = auth.uid()），不是跨表子查詢判斷身分，
-- 這一點很重要：daily_care_logs / blood_tests 的 RLS 之後會反過來查詢這張表判斷
-- 「你是不是這隻貓的 accepted caregiver」，如果這裡也用子查詢判斷身分，會變成
-- 用同一張表的 RLS 卡住自己的子查詢，caregiver 永遠查不到自己那筆資料。
create policy "Invitees can view their own caregiver record"
  on pet_caregivers
  for select
  using (user_id = auth.uid());

-- 被邀請者只能把自己這筆邀請從 PENDING 改成 ACCEPTED，不能藉機改 pet_id / user_id
-- 把自己的邀請「移植」去存取一隻從未受邀的貓（這是 RLS with check 只檢查新資料列時
-- 常被忽略的權限升級風險：如果不擋，惡意使用者可以在同一次 UPDATE 裡偷改 pet_id）。
create or replace function prevent_pet_caregiver_identity_change()
returns trigger as $$
begin
  if new.pet_id is distinct from old.pet_id or new.user_id is distinct from old.user_id then
    raise exception 'pet_id and user_id cannot be changed after a caregiver record is created';
  end if;
  return new;
end;
$$ language plpgsql;

create trigger pet_caregivers_prevent_identity_change
  before update on pet_caregivers
  for each row
  execute function prevent_pet_caregiver_identity_change();

create policy "Invitees can accept their own pending invitation"
  on pet_caregivers
  for update
  using (user_id = auth.uid() and status = 'PENDING')
  with check (user_id = auth.uid() and status = 'ACCEPTED');

-- 本專案的既有教訓：SQL Editor 建的表不會自動繼承預設權限，要明確 grant 給每個會用到的角色
grant select, insert, update, delete on table pet_caregivers to authenticated;
grant select, insert, update, delete on table pet_caregivers to service_role;
