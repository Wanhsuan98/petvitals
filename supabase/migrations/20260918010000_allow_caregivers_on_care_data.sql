-- 多照護者協作：讓 accepted caregiver 也能讀寫該貓的 daily_care_logs / blood_tests。
--
-- 這個功能綁定訂閱狀態：只有 owner 的訂閱是 active 時，第 2 位起的協作者才有存取權；
-- owner 本人不受這個限制（owner 永久保有存取，即使沒有訂閱也一樣，只是不能再邀請新協作者）。
-- 訂閱取消/失效後，既有的 pet_caregivers 資料列不會被刪除，只是這條 RLS 政策會擋下查詢，
-- 訂閱恢復後自動復權，不需要重新邀請。

-- 重要前提：下面 daily_care_logs / blood_tests 的政策，子查詢會 join cat_profiles 跟
-- subscriptions。這兩張表本身也有 RLS，而且原本都只認 owner_id = auth.uid()——
-- 如果不先幫 caregiver 開一道讀取權限，caregiver 查詢時，這些子查詢會被 cat_profiles /
-- subscriptions 自己的 RLS 擋成空結果，導致整個「你是不是 accepted caregiver 且訂閱有效」
-- 的判斷永遠是 false。所以要先在這兩張表補上「accepted caregiver 也能讀」的政策。

-- caregiver 需要能讀到自己被邀請那隻貓的基本資料（頁面本身也需要，例如目標體重、醫囑量）
create policy "Accepted caregivers can view their assigned cat profiles"
  on cat_profiles
  for select
  using (
    exists (
      select 1 from pet_caregivers
      where pet_caregivers.pet_id = cat_profiles.id
        and pet_caregivers.user_id = auth.uid()
        and pet_caregivers.status = 'ACCEPTED'
    )
  );

-- caregiver 需要能讀到「貓的 owner」目前的訂閱狀態，才能判斷自己還有沒有存取權
-- （不是讀自己的訂閱，caregiver 本來就不會有自己的訂閱資料列）
create policy "Accepted caregivers can view their owner's subscription status"
  on subscriptions
  for select
  using (
    exists (
      select 1 from pet_caregivers
      join cat_profiles on cat_profiles.id = pet_caregivers.pet_id
      where pet_caregivers.user_id = auth.uid()
        and pet_caregivers.status = 'ACCEPTED'
        and cat_profiles.owner_id = subscriptions.owner_id
    )
  );

drop policy if exists "Owners can manage their own cats' daily care logs" on daily_care_logs;

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
      join cat_profiles on cat_profiles.id = pet_caregivers.pet_id
      join subscriptions on subscriptions.owner_id = cat_profiles.owner_id
      where pet_caregivers.pet_id = daily_care_logs.pet_id
        and pet_caregivers.user_id = auth.uid()
        and pet_caregivers.status = 'ACCEPTED'
        and subscriptions.status = 'active'
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
      join cat_profiles on cat_profiles.id = pet_caregivers.pet_id
      join subscriptions on subscriptions.owner_id = cat_profiles.owner_id
      where pet_caregivers.pet_id = daily_care_logs.pet_id
        and pet_caregivers.user_id = auth.uid()
        and pet_caregivers.status = 'ACCEPTED'
        and subscriptions.status = 'active'
    )
  );

drop policy if exists "Owners can manage their own cats' blood tests" on blood_tests;

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
      join cat_profiles on cat_profiles.id = pet_caregivers.pet_id
      join subscriptions on subscriptions.owner_id = cat_profiles.owner_id
      where pet_caregivers.pet_id = blood_tests.pet_id
        and pet_caregivers.user_id = auth.uid()
        and pet_caregivers.status = 'ACCEPTED'
        and subscriptions.status = 'active'
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
      join cat_profiles on cat_profiles.id = pet_caregivers.pet_id
      join subscriptions on subscriptions.owner_id = cat_profiles.owner_id
      where pet_caregivers.pet_id = blood_tests.pet_id
        and pet_caregivers.user_id = auth.uid()
        and pet_caregivers.status = 'ACCEPTED'
        and subscriptions.status = 'active'
    )
  );
