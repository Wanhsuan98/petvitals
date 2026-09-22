-- 產品決策變更：多照護者協作不再綁定訂閱狀態，改成跟核心記錄功能一樣永久免費。
-- 只保留「每隻貓最多 MAX_CAREGIVERS_PER_PET 人」的人數上限（應用層檢查），
-- 拿掉「owner 的訂閱要 active，第 2 位起的協作者才有存取權」這條規則。
-- 決策脈絡見 docs/05-decisions/ADR-002-subscription-tier-model.md。

drop policy if exists "Owners and accepted caregivers can manage daily care logs" on daily_care_logs;

create policy "Owners and accepted caregivers can manage daily care logs"
  on daily_care_logs
  for all
  using (
    exists (
      select 1 from cat_profiles
      where cat_profiles.id = daily_care_logs.pet_id
        and cat_profiles.owner_id = auth.uid()
    )
    or exists (
      select 1 from pet_caregivers
      where pet_caregivers.pet_id = daily_care_logs.pet_id
        and pet_caregivers.user_id = auth.uid()
        and pet_caregivers.status = 'ACCEPTED'
    )
  )
  with check (
    exists (
      select 1 from cat_profiles
      where cat_profiles.id = daily_care_logs.pet_id
        and cat_profiles.owner_id = auth.uid()
    )
    or exists (
      select 1 from pet_caregivers
      where pet_caregivers.pet_id = daily_care_logs.pet_id
        and pet_caregivers.user_id = auth.uid()
        and pet_caregivers.status = 'ACCEPTED'
    )
  );

drop policy if exists "Owners and accepted caregivers can manage blood tests" on blood_tests;

create policy "Owners and accepted caregivers can manage blood tests"
  on blood_tests
  for all
  using (
    exists (
      select 1 from cat_profiles
      where cat_profiles.id = blood_tests.pet_id
        and cat_profiles.owner_id = auth.uid()
    )
    or exists (
      select 1 from pet_caregivers
      where pet_caregivers.pet_id = blood_tests.pet_id
        and pet_caregivers.user_id = auth.uid()
        and pet_caregivers.status = 'ACCEPTED'
    )
  )
  with check (
    exists (
      select 1 from cat_profiles
      where cat_profiles.id = blood_tests.pet_id
        and cat_profiles.owner_id = auth.uid()
    )
    or exists (
      select 1 from pet_caregivers
      where pet_caregivers.pet_id = blood_tests.pet_id
        and pet_caregivers.user_id = auth.uid()
        and pet_caregivers.status = 'ACCEPTED'
    )
  );

-- 不再需要 caregiver 讀 owner 的訂閱狀態（原本只有上面兩條政策需要這個資訊）
drop policy if exists "Accepted caregivers can view their owner's subscription status" on subscriptions;
