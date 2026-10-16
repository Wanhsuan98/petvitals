-- 協作者也能編輯、刪除每日照護紀錄與血檢紀錄（見 docs/05-decisions/ADR-007）。
--
-- 20260922000000_restrict_caregiver_delete.sql 把協作者限制成只能 select / insert，
-- 理由是避免任何協作者直接刪光病史。產品決策改為「照顧責任平均分攤」：飼主與協作者
-- 對這兩張表有相同的新增、編輯、刪除權限。cat_profiles、pet_caregivers 的政策不變，
-- 協作者仍然不能修改貓咪資料、邀請/移除協作者或刪除貓咪。
--
-- 條件沿用既有的 select / insert 政策：accepted caregiver 即可，不需要額外狀態。

create policy "Accepted caregivers can update daily care logs"
  on daily_care_logs
  for update
  using (
    exists (
      select 1 from pet_caregivers
      where pet_caregivers.pet_id = daily_care_logs.pet_id
        and pet_caregivers.user_id = auth.uid()
        and pet_caregivers.status = 'ACCEPTED'
    )
  )
  with check (
    exists (
      select 1 from pet_caregivers
      where pet_caregivers.pet_id = daily_care_logs.pet_id
        and pet_caregivers.user_id = auth.uid()
        and pet_caregivers.status = 'ACCEPTED'
    )
  );

create policy "Accepted caregivers can delete daily care logs"
  on daily_care_logs
  for delete
  using (
    exists (
      select 1 from pet_caregivers
      where pet_caregivers.pet_id = daily_care_logs.pet_id
        and pet_caregivers.user_id = auth.uid()
        and pet_caregivers.status = 'ACCEPTED'
    )
  );

create policy "Accepted caregivers can update blood tests"
  on blood_tests
  for update
  using (
    exists (
      select 1 from pet_caregivers
      where pet_caregivers.pet_id = blood_tests.pet_id
        and pet_caregivers.user_id = auth.uid()
        and pet_caregivers.status = 'ACCEPTED'
    )
  )
  with check (
    exists (
      select 1 from pet_caregivers
      where pet_caregivers.pet_id = blood_tests.pet_id
        and pet_caregivers.user_id = auth.uid()
        and pet_caregivers.status = 'ACCEPTED'
    )
  );

create policy "Accepted caregivers can delete blood tests"
  on blood_tests
  for delete
  using (
    exists (
      select 1 from pet_caregivers
      where pet_caregivers.pet_id = blood_tests.pet_id
        and pet_caregivers.user_id = auth.uid()
        and pet_caregivers.status = 'ACCEPTED'
    )
  );
