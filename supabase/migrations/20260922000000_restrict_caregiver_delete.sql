-- Code review 發現：daily_care_logs / blood_tests 的協作者政策用 for all，
-- 等於任何協作者都能直接刪除整隻貓的照護紀錄，超出「caregiver 僅能讀寫日常照護資料」的文件範疇，
-- 對一個追蹤慢性病史的 App 來說是真實的資料保護風險。拆成 select/insert，不給協作者 delete；
-- owner 維持 for all（含 delete，這是既有行為，不變動）。

drop policy if exists "Owners and accepted caregivers can manage daily care logs" on daily_care_logs;

create policy "Owners can manage their own cats daily care logs"
  on daily_care_logs
  for all
  using (
    exists (
      select 1 from cat_profiles
      where cat_profiles.id = daily_care_logs.pet_id
        and cat_profiles.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from cat_profiles
      where cat_profiles.id = daily_care_logs.pet_id
        and cat_profiles.owner_id = auth.uid()
    )
  );

create policy "Accepted caregivers can read daily care logs"
  on daily_care_logs
  for select
  using (
    exists (
      select 1 from pet_caregivers
      where pet_caregivers.pet_id = daily_care_logs.pet_id
        and pet_caregivers.user_id = auth.uid()
        and pet_caregivers.status = 'ACCEPTED'
    )
  );

create policy "Accepted caregivers can add daily care logs"
  on daily_care_logs
  for insert
  with check (
    exists (
      select 1 from pet_caregivers
      where pet_caregivers.pet_id = daily_care_logs.pet_id
        and pet_caregivers.user_id = auth.uid()
        and pet_caregivers.status = 'ACCEPTED'
    )
  );

drop policy if exists "Owners and accepted caregivers can manage blood tests" on blood_tests;

create policy "Owners can manage their own cats blood tests"
  on blood_tests
  for all
  using (
    exists (
      select 1 from cat_profiles
      where cat_profiles.id = blood_tests.pet_id
        and cat_profiles.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from cat_profiles
      where cat_profiles.id = blood_tests.pet_id
        and cat_profiles.owner_id = auth.uid()
    )
  );

create policy "Accepted caregivers can read blood tests"
  on blood_tests
  for select
  using (
    exists (
      select 1 from pet_caregivers
      where pet_caregivers.pet_id = blood_tests.pet_id
        and pet_caregivers.user_id = auth.uid()
        and pet_caregivers.status = 'ACCEPTED'
    )
  );

create policy "Accepted caregivers can add blood tests"
  on blood_tests
  for insert
  with check (
    exists (
      select 1 from pet_caregivers
      where pet_caregivers.pet_id = blood_tests.pet_id
        and pet_caregivers.user_id = auth.uid()
        and pet_caregivers.status = 'ACCEPTED'
    )
  );
