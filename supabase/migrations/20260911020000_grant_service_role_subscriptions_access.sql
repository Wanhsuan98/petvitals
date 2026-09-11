-- 這個專案透過 SQL Editor 建立的資料表，不會自動取得 service_role 的預設權限
-- （跟先前 cat_profiles/daily_care_logs/blood_tests 需要補 authenticated GRANT 是同一個成因）。
-- webhook 與取消訂閱都是用 service_role client 略過 RLS 寫入，沒有這段 GRANT 一樣會被
-- Postgres 擋在 RLS 檢查之前，直接回 permission denied。
grant select, insert, update, delete on table subscriptions to service_role;
