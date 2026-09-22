-- 目前沒有任何程式路徑用 service_role 存取這三張表，但照本專案已經踩過好幾次的教訓
-- （SQL Editor 建的表不會自動繼承預設權限），先補上避免之後真的需要時才發現卡住。
grant select, insert, update, delete on table cat_profiles to service_role;
grant select, insert, update, delete on table daily_care_logs to service_role;
grant select, insert, update, delete on table blood_tests to service_role;
