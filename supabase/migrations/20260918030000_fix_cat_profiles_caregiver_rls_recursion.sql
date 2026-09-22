-- 修正：cat_profiles 的「協作者可讀」政策查詢 pet_caregivers，
-- pet_caregivers 的「owner 可管理」政策又查詢 cat_profiles——這兩張表的 RLS 互相查對方，
-- Postgres 偵測到這是一個會無限展開的循環，直接報錯：
-- "infinite recursion detected in policy for relation cat_profiles"
-- 而且不只協作者會踩到：一般 owner 查自己的貓時，Postgres 仍然會一併評估
-- 「協作者可讀」這條政策（多個 permissive 政策是用 OR 組合，不會因為第一條就成立而跳過），
-- 所以這個 bug 會讓所有人都讀不到 cat_profiles，不只影響協作者功能。
--
-- 修法：用 security definer 函式打斷循環。函式內部查詢用「建立函式的角色」執行
-- （這裡是 table owner，預設會略過自己表的 RLS），不再用「目前登入的使用者」身分
-- 觸發對方表的 RLS，循環就斷了。

create or replace function owns_cat_profile(check_pet_id uuid, check_user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from cat_profiles
    where cat_profiles.id = check_pet_id
      and cat_profiles.owner_id = check_user_id
  );
$$;

create or replace function is_invited_caregiver(check_pet_id uuid, check_user_id uuid)
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
      and pet_caregivers.status in ('PENDING', 'ACCEPTED')
  );
$$;

revoke all on function owns_cat_profile(uuid, uuid) from public;
revoke all on function is_invited_caregiver(uuid, uuid) from public;
grant execute on function owns_cat_profile(uuid, uuid) to authenticated, service_role;
grant execute on function is_invited_caregiver(uuid, uuid) to authenticated, service_role;

-- 重寫 pet_caregivers 的 owner 政策：改呼叫函式判斷 owner 身分，不再直接查 cat_profiles
drop policy if exists "Owners can manage caregivers for their own cats" on pet_caregivers;

create policy "Owners can manage caregivers for their own cats"
  on pet_caregivers
  for all
  using (owns_cat_profile(pet_caregivers.pet_id, auth.uid()))
  with check (owns_cat_profile(pet_caregivers.pet_id, auth.uid()));

-- 重寫 cat_profiles 的協作者讀取政策：改呼叫函式判斷協作關係，不再直接查 pet_caregivers
drop policy if exists "Invited caregivers can view their assigned cat profiles" on cat_profiles;

create policy "Invited caregivers can view their assigned cat profiles"
  on cat_profiles
  for select
  using (is_invited_caregiver(cat_profiles.id, auth.uid()));
