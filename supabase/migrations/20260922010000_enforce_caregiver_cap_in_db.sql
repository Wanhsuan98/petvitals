-- Code review 發現：inviteCaregiverAction 的人數上限檢查是「先讀 count 再寫入」，
-- 中間沒有任何鎖，兩個併發邀請可以都通過檢查、都寫入成功，讓一隻貓超過
-- MAX_CAREGIVERS_PER_PET（目前是 3，定義在 lib/schemas.ts，Postgres 這邊無法直接引用
-- TypeScript 常數，這裡硬編碼 3，之後如果調整上限，這裡要記得一起改）。
--
-- 用 advisory lock 把同一隻貓的併發 INSERT 序列化：同一時間只有一筆 pet_caregivers
-- 的新增交易能真正檢查並更新這隻貓的人數，其餘的併發交易會排隊等鎖，鎖到手之後
-- 看到的 count 才是最新的，不會兩邊都以為「還有名額」。
create or replace function enforce_caregiver_cap()
returns trigger as $$
declare
  existing_seats int;
begin
  perform pg_advisory_xact_lock(hashtext(new.pet_id::text));

  select count(*) into existing_seats
  from pet_caregivers
  where pet_id = new.pet_id
    and status in ('PENDING', 'ACCEPTED');

  -- existing_seats 還沒把這筆正在 INSERT 的算進去，+1 代表 owner 本人
  if existing_seats + 1 >= 3 then
    raise exception 'CAREGIVER_CAP_REACHED';
  end if;

  return new;
end;
$$ language plpgsql;

create trigger pet_caregivers_enforce_cap
  before insert on pet_caregivers
  for each row
  execute function enforce_caregiver_cap();
