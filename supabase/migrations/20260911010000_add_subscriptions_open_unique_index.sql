-- 保證同一位使用者最多只能有一筆「進行中」的訂閱（pending 或 active），
-- 避免併發觸發 /api/ecpay/checkout（例如手滑點兩次、開兩個分頁）造成重複訂閱、重複扣款。
-- 用 partial unique index 而非一般 unique 約束，因為取消/失敗的歷史紀錄應該保留，
-- 允許使用者取消後重新訂閱。
create unique index subscriptions_owner_id_open_idx
  on subscriptions (owner_id)
  where status in ('pending', 'active');
