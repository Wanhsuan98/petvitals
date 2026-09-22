-- Code review 發現：find_user_id_by_email 用大小寫敏感的 = 比對 email，
-- owner 打的大小寫如果跟帳號實際註冊的不同，會查不到人，錯誤訊息卻說「找不到帳號」，
-- 誤導使用者以為對方沒註冊。改用 lower() 比對兩邊，並保留函式簽章不變。
create or replace function find_user_id_by_email(lookup_email text)
returns uuid
language sql
security definer
set search_path = auth, pg_temp
as $$
  select id from auth.users where lower(email) = lower(lookup_email) limit 1;
$$;
