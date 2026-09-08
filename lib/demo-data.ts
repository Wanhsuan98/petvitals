import type { CatProfile } from '@/lib/schemas'

// TODO(Week 3): 移除此檔案，改由已登入使用者實際建立/查詢的 CatProfile 取代（Supabase Auth 串接後）
// 目前 UI 多處都需要一個「目前綁定的貓咪」資料，先集中在這裡維護單一事實來源，
// 避免每個頁面各自重複定義 demo 值（例如各自寫一個 DEMO_PET_ID 常數）。
export const DEMO_CAT_PROFILE: CatProfile = {
  id: '00000000-0000-0000-0000-000000000001',
  ownerId: '00000000-0000-0000-0000-000000000002',
  name: '小橘',
  birthYear: 2019,
  targetWeightKg: 4.2,
  irisStage: 'STAGE_2',
  dailyFluidTargetMl: 200,
  subQFluidPrescribedMl: 100,
  subQFluidFrequencyPerDay: 1
}

export const DEMO_PET_ID = DEMO_CAT_PROFILE.id

export const IRIS_STAGE_LABELS: Record<CatProfile['irisStage'], string> = {
  STAGE_1: 'IRIS 第 1 期',
  STAGE_2: 'IRIS 第 2 期',
  STAGE_3: 'IRIS 第 3 期',
  STAGE_4: 'IRIS 第 4 期'
}
