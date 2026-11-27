-- AI 功能的使用紀錄與每日上限（見 docs/02-data-contract/ai-usage-log.md、ADR-010）。
--
-- 只記錄「誰、哪隻貓、哪個功能、哪一天、結果如何、用了多少 token」，
-- 不保存任何照片、prompt 或 AI 輸出內容。
--
-- 上限有兩組，都以「每隻貓、每個功能、每個 Asia/Taipei 日期」計算：
--   每天上限：PENDING / SUCCEEDED / REFUSED / INVALID 計入（API 有處理就會收費）
--   總嘗試上限：所有狀態都計入，包含 FAILED，是費用的硬上限
-- 數字在 lib/schemas.ts 的 AI_DAILY_LIMITS / AI_ATTEMPT_LIMITS 也有一份，
-- Postgres 無法引用 TypeScript 常數，調整時兩邊要一起改。

create table if not exists ai_usage_logs (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references cat_profiles (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  feature text not null check (feature in ('BLOOD_TEST_EXTRACTION', 'CARE_SUMMARY')),
  used_on date not null,
  status text not null check (status in ('PENDING', 'SUCCEEDED', 'REFUSED', 'INVALID', 'FAILED')),
  model text check (model is null or char_length(model) <= 50),
  input_tokens integer check (input_tokens is null or input_tokens >= 0),
  output_tokens integer check (output_tokens is null or output_tokens >= 0),
  error_code text check (error_code is null or char_length(error_code) <= 50),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ai_usage_logs_pet_feature_day_idx
  on ai_usage_logs (pet_id, feature, used_on);

create index if not exists ai_usage_logs_created_idx on ai_usage_logs (created_at);

alter table ai_usage_logs enable row level security;

-- 飼主與 accepted caregiver 可以讀這隻貓的紀錄，用來顯示「今天還剩幾次」。
-- 用既有的 security definer 函式判斷，避免跨表 RLS 互相查對方造成無限遞迴
create policy "Owners and caregivers can view AI usage of their cat"
  on ai_usage_logs
  for select
  using (
    owns_cat_profile(pet_id, auth.uid())
    or is_accepted_caregiver(pet_id, auth.uid())
  );

-- authenticated 只能讀，所有寫入都透過下面兩個函式；service_role 用於每日清除舊紀錄
grant select on table ai_usage_logs to authenticated;
grant select, insert, update, delete on table ai_usage_logs to service_role;

-- 先占名額，再呼叫 AI。回傳新紀錄的 id，超過上限時丟出 AI_USAGE_LIMIT_REACHED。
-- 用 advisory lock 依 (pet_id, feature) 序列化：兩個同時送出的請求不會都看到「還有名額」
-- （與 enforce_caregiver_cap 相同的做法）
create or replace function claim_ai_usage(p_pet_id uuid, p_feature text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  caller uuid := auth.uid();
  today date := (now() at time zone 'Asia/Taipei')::date;
  daily_limit int;
  attempt_limit int;
  counted int;
  attempts int;
  new_id uuid;
begin
  if caller is null then
    raise exception 'AI_USAGE_UNAUTHENTICATED';
  end if;

  if not (owns_cat_profile(p_pet_id, caller) or is_accepted_caregiver(p_pet_id, caller)) then
    raise exception 'AI_USAGE_FORBIDDEN';
  end if;

  case p_feature
    when 'BLOOD_TEST_EXTRACTION' then
      daily_limit := 10;
      attempt_limit := 30;
    when 'CARE_SUMMARY' then
      daily_limit := 5;
      attempt_limit := 15;
    else
      raise exception 'AI_USAGE_UNKNOWN_FEATURE';
  end case;

  perform pg_advisory_xact_lock(hashtext('ai_usage:' || p_pet_id::text || ':' || p_feature));

  select
    count(*) filter (where status <> 'FAILED'),
    count(*)
  into counted, attempts
  from ai_usage_logs
  where pet_id = p_pet_id
    and feature = p_feature
    and used_on = today;

  if counted >= daily_limit or attempts >= attempt_limit then
    raise exception 'AI_USAGE_LIMIT_REACHED';
  end if;

  insert into ai_usage_logs (pet_id, user_id, feature, used_on, status)
  values (p_pet_id, caller, p_feature, today, 'PENDING')
  returning id into new_id;

  return new_id;
end;
$$;

-- 記錄 AI 呼叫的結果。只能把自己建立的 PENDING 紀錄改成其他狀態，不能改回 PENDING，
-- 也不能改別人的紀錄（找不到符合條件的紀錄時靜默不動作）
create or replace function finish_ai_usage(
  p_id uuid,
  p_status text,
  p_model text,
  p_input_tokens integer,
  p_output_tokens integer,
  p_error_code text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_status not in ('SUCCEEDED', 'REFUSED', 'INVALID', 'FAILED') then
    raise exception 'AI_USAGE_INVALID_STATUS';
  end if;

  update ai_usage_logs
  set status = p_status,
      model = left(p_model, 50),
      input_tokens = p_input_tokens,
      output_tokens = p_output_tokens,
      error_code = left(p_error_code, 50),
      updated_at = now()
  where id = p_id
    and user_id = auth.uid()
    and status = 'PENDING';
end;
$$;

revoke execute on function claim_ai_usage(uuid, text) from public, anon;
revoke execute on function finish_ai_usage(uuid, text, text, integer, integer, text) from public, anon;
grant execute on function claim_ai_usage(uuid, text) to authenticated;
grant execute on function finish_ai_usage(uuid, text, text, integer, integer, text) to authenticated;
