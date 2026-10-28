-- 補上原本只有 Zod 檢查、資料庫沒有對應限制的三個欄位（見 docs/02-data-contract/）。
-- 正常操作一定會先經過 Zod，這裡是多一層防護：繞過 App 直接呼叫 PostgREST 時也寫不進不合法的值。
-- 套用前已用唯讀查詢確認正式資料沒有違反下列條件的資料列，所以直接加上會驗證既有資料的約束。

-- 1. 出生年份：2000 到「今年 + 1」，跟 CatProfileSchema.birthYear 一致。
-- 「今年」在三個地方各算一次：表單的 Zod 用裝置本地時間（台北），Server Action 的 Zod 跑在
-- Vercel 上用 UTC，台北 1/1 00:00–08:00 時兩邊差一年，那幾小時是伺服器端 Zod 先擋下。
-- 資料庫取台北年份，是兩者中較寬的一邊，確保資料庫永遠不會比 Zod 更嚴。
-- CHECK 裡用 now() 是可以的（PostgreSQL 不會重新檢查舊資料），而且上限只會隨時間放寬，
-- 已經寫入的資料不會因為時間經過變得不合法
alter table cat_profiles
  add constraint cat_profiles_birth_year_check
  check (
    birth_year >= 2000
    and birth_year <= extract(year from (now() at time zone 'Asia/Taipei'))::int + 1
  );

-- 2. 邀請 email：只擋「明顯不是 email」的值（要有 @ 與網域，且不含空白），
-- 比 Zod 的 email() 寬鬆；完整格式驗證仍由 Zod 負責，避免兩邊規則不一致時資料庫擋掉 Zod 允許的值
alter table pet_caregivers
  add constraint pet_caregivers_invited_email_check
  check (invited_email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$');

-- 3. 提醒時間：分鐘只能是 5 的倍數。cron 把現在時間捨去到 5 分鐘再比對，
-- 其他分鐘的排程永遠不會觸發，原本的約束只檢查 HH:mm 格式
alter table reminder_schedules
  drop constraint if exists reminder_schedules_time_of_day_check;

alter table reminder_schedules
  add constraint reminder_schedules_time_of_day_check
  check (time_of_day ~ '^([01][0-9]|2[0-3]):[0-5][05]$');
