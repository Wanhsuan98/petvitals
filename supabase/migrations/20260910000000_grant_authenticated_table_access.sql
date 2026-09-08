-- 透過 SQL Editor 建立的資料表不會自動 GRANT 給 authenticated 角色
-- （只有用 Dashboard 的 Table Editor 手動建表才會自動加上）。
-- Postgres 會先檢查 GRANT，通過後才會評估 RLS policy，
-- 沒有這段 GRANT 的話，RLS policy 完全不會被評估到，直接回 permission denied。
grant select, insert, update, delete on table cat_profiles to authenticated;
grant select, insert, update, delete on table daily_care_logs to authenticated;
grant select, insert, update, delete on table blood_tests to authenticated;
