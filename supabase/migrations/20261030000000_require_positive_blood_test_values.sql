-- 血檢數值必須大於 0（見 docs/02-data-contract/blood-test.md、ADR-009）。
-- 原本的 CHECK 允許 0，而新增血檢表單又把 BUN、肌酸酐、血磷預設為 0：沒填就送出會存成 0，
-- 被血磷判斷為「正常」，圖表也掉到 0。這些指標在活體上不可能為 0，所以下限改為大於 0，上限不變。
--
-- 套用前必須先修正既有的 0 值資料（2026-10-29 唯讀查詢時正式資料庫有 1 筆），
-- 否則加上 CHECK 會失敗。這裡先檢查一次，有的話以清楚的訊息中止，而不是讓 PostgreSQL
-- 回一個看不出原因的約束違反錯誤；也刻意不用 not valid 跳過舊資料，避免錯誤資料無聲留下來
do $$
declare
  invalid_count integer;
begin
  select count(*) into invalid_count
  from blood_tests
  where bun <= 0
    or creatinine <= 0
    or phosphorus <= 0
    or sdma <= 0
    or hct <= 0;

  if invalid_count > 0 then
    raise exception
      'blood_tests 有 % 筆數值為 0 的紀錄，請先在 App 編輯成正確數值或刪除，再套用這個 migration',
      invalid_count;
  end if;
end $$;

-- 欄位層級的 CHECK 建在 init_schema，名稱是 PostgreSQL 預設的 <table>_<column>_check
alter table blood_tests drop constraint if exists blood_tests_bun_check;
alter table blood_tests add constraint blood_tests_bun_check check (bun > 0 and bun <= 300);

alter table blood_tests drop constraint if exists blood_tests_creatinine_check;
alter table blood_tests
  add constraint blood_tests_creatinine_check check (creatinine > 0 and creatinine <= 30);

alter table blood_tests drop constraint if exists blood_tests_sdma_check;
alter table blood_tests add constraint blood_tests_sdma_check check (sdma > 0 and sdma <= 100);

alter table blood_tests drop constraint if exists blood_tests_phosphorus_check;
alter table blood_tests
  add constraint blood_tests_phosphorus_check check (phosphorus > 0 and phosphorus <= 30);

alter table blood_tests drop constraint if exists blood_tests_hct_check;
alter table blood_tests add constraint blood_tests_hct_check check (hct > 0 and hct <= 70);
