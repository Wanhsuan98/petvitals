-- 邀請協作者時，owner 只會輸入 email，需要換成 auth.users.id 才能寫進 pet_caregivers.user_id。
-- auth.users 預設不透過 PostgREST 對外開放（也不應該開放，裡面有密碼雜湊等敏感欄位），
-- 一般 authenticated/anon 角色查不到；這裡用 security definer 函式只回傳 id，
-- 且只 grant 給 service_role，一般使用者連呼叫都不行，避免變成一個「拿 email 換 user id」的
-- 帳號列舉工具被濫用。
create or replace function find_user_id_by_email(lookup_email text)
returns uuid
language sql
security definer
set search_path = auth, pg_temp
as $$
  select id from auth.users where email = lookup_email limit 1;
$$;

revoke all on function find_user_id_by_email(text) from public;
revoke all on function find_user_id_by_email(text) from authenticated;
grant execute on function find_user_id_by_email(text) to service_role;

-- 被邀請者在「接受邀請」之前，也要能看到被邀請去哪隻貓（顯示貓的名字），
-- 不然邀請畫面沒辦法呈現任何有意義的資訊。這是有意放寬的範圍：
-- 貓的基本資料（名字、目標體重等）本來就是邀請內容的一部分，不是額外洩漏。
drop policy if exists "Accepted caregivers can view their assigned cat profiles" on cat_profiles;

create policy "Invited caregivers can view their assigned cat profiles"
  on cat_profiles
  for select
  using (
    exists (
      select 1 from pet_caregivers
      where pet_caregivers.pet_id = cat_profiles.id
        and pet_caregivers.user_id = auth.uid()
        and pet_caregivers.status in ('PENDING', 'ACCEPTED')
    )
  );
