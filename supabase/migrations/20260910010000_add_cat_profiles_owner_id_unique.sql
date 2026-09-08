-- 保證同一位使用者只能有一筆 cat_profiles，避免併發送出建檔表單造成重複資料
alter table cat_profiles add constraint cat_profiles_owner_id_key unique (owner_id);
