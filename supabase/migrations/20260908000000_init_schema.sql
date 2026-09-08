-- PetVitals 初始 schema：對應 lib/schemas.ts 的 CatProfileSchema / DailyCareLogSchema / BloodTestSchema。
-- 欄位採 snake_case（Postgres/Supabase 慣例），app 端讀寫時會做 camelCase <-> snake_case 轉換，
-- 不直接用 camelCase 欄位名稱，避免整份 SQL 都要手動加雙引號才能正確參照。

-- ==========================================
-- 1. 貓咪基本檔案
-- ==========================================
create table if not exists cat_profiles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 20),
  birth_year int not null,
  target_weight_kg numeric not null check (target_weight_kg > 0),
  iris_stage text not null default 'STAGE_2'
    check (iris_stage in ('STAGE_1', 'STAGE_2', 'STAGE_3', 'STAGE_4')),
  daily_fluid_target_ml numeric not null default 200
    check (daily_fluid_target_ml between 50 and 1000),
  sub_q_fluid_prescribed_ml numeric not null default 100
    check (sub_q_fluid_prescribed_ml between 0 and 500),
  sub_q_fluid_frequency_per_day int not null default 1
    check (sub_q_fluid_frequency_per_day between 1 and 3),
  created_at timestamptz not null default now()
);

create index if not exists cat_profiles_owner_id_idx on cat_profiles (owner_id);

-- ==========================================
-- 2. 每日居家照護日誌
-- ==========================================
create table if not exists daily_care_logs (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references cat_profiles (id) on delete cascade,
  recorded_at timestamptz not null,
  -- 用 Postgres 原生 date 型別：本身就會擋掉像 2026-02-30 這種不存在的日期，
  -- 效果等同 app 端 DailyCareLogSchema 的 isValidCalendarDate 檢查，不需要重複實作。
  date date not null,
  weight_kg numeric check (weight_kg between 1.0 and 15.0),
  sub_q_fluid_ml numeric not null default 0 check (sub_q_fluid_ml between 0 and 600),
  water_intake_ml numeric not null default 0 check (water_intake_ml between 0 and 1000),
  appetite_level text not null default 'NORMAL'
    check (appetite_level in ('GREAT', 'NORMAL', 'POOR', 'FORCE_FEED')),
  vomit_count int not null default 0 check (vomit_count between 0 and 20),
  notes text check (char_length(notes) <= 100),
  created_at timestamptz not null default now()
);

create index if not exists daily_care_logs_pet_id_idx on daily_care_logs (pet_id);
create index if not exists daily_care_logs_pet_id_date_idx on daily_care_logs (pet_id, date);

-- ==========================================
-- 3. 生化血檢指標
-- ==========================================
create table if not exists blood_tests (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references cat_profiles (id) on delete cascade,
  test_date date not null,
  hospital_name text check (char_length(hospital_name) <= 30),
  bun numeric not null check (bun between 0 and 300),
  creatinine numeric not null check (creatinine between 0 and 30),
  sdma numeric check (sdma between 0 and 100),
  phosphorus numeric not null check (phosphorus between 0 and 30),
  hct numeric check (hct between 0 and 70),
  notes text check (char_length(notes) <= 100),
  created_at timestamptz not null default now()
);

create index if not exists blood_tests_pet_id_idx on blood_tests (pet_id);
create index if not exists blood_tests_pet_id_test_date_idx on blood_tests (pet_id, test_date);

-- ==========================================
-- Row Level Security：每個使用者只能存取自己貓咪的資料
-- ==========================================
alter table cat_profiles enable row level security;
alter table daily_care_logs enable row level security;
alter table blood_tests enable row level security;

create policy "Owners can manage their own cat profiles"
  on cat_profiles
  for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "Owners can manage their own cats' daily care logs"
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

create policy "Owners can manage their own cats' blood tests"
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
