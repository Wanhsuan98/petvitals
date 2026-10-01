-- cron job 用這個欄位判斷「今天是否已經發送過這則提醒」，避免 GitHub Actions
-- 排程的執行時間誤差（延遲觸發、同一個 5 分鐘區間內不只跑一次）造成同一則提醒
-- 一天內被重複推播
alter table reminder_schedules add column if not exists last_sent_on date;
