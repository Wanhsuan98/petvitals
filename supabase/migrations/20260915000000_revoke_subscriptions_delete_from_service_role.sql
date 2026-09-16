-- 目前程式碼完全沒有任何路徑會刪除 subscriptions 資料列，收回 delete 權限貼近實際使用範圍
revoke delete on table subscriptions from service_role;
