import { z } from 'zod'

// 驗證 YYYY-MM-DD 字串是否為實際存在的日期（regex 僅檢查格式，無法擋掉如 2026-02-30 的無效日期）
function isValidCalendarDate(dateStr: string): boolean {
  const [year, month, day] = dateStr.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
}

// ==========================================
// 1. 貓咪基本檔案 Schema
// ==========================================
export const CatProfileSchema = z.object({
  id: z.string().uuid(),
  ownerId: z.string().uuid(), // 綁定 Supabase auth.users.id，供 RLS 權限隔離使用
  name: z.string().min(1, '請輸入貓咪名字').max(20),
  birthYear: z
    .number()
    .int()
    .min(2000)
    .max(new Date().getFullYear() + 1),
  targetWeightKg: z.number().positive('目標體重必須大於 0'),
  irisStage: z.enum(['STAGE_1', 'STAGE_2', 'STAGE_3', 'STAGE_4']).default('STAGE_2'), // 使用者依獸醫診斷結果手動設定，非系統自動判定
  dailyFluidTargetMl: z.number().min(50).max(1000).default(200), // 每日飲水目標（不含輸液）
  subQFluidPrescribedMl: z.number().min(0).max(500).default(100), // 醫囑單次皮下輸液量
  subQFluidFrequencyPerDay: z.number().int().min(1).max(3).default(1), // 醫囑每日輸液次數，用於計算輸液達成度分母
  createdAt: z.string().datetime().optional()
})

// ==========================================
// 2. 每日居家照護日誌 Schema (時序與防呆)
// ==========================================
export const DailyCareLogSchema = z.object({
  id: z.string().uuid().optional(),
  petId: z.string().uuid(),
  recordedAt: z.string().datetime(), // 精確打卡時間點，同一天可有多筆記錄（例如早晚各一次輸液）
  // 由 recordedAt 依裝置本地時區派生（非 UTC），避免深夜打卡時因時區換算跨日，導致 date 與使用者實際感知的日期不一致
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式必須為 YYYY-MM-DD')
    .refine(isValidCalendarDate, '請輸入實際存在的日期'),
  weightKg: z.number().min(1.0, '體重異常過低').max(15.0, '體重異常過高').optional(),
  // 此上限僅為輸入手滑防呆（例如誤打成 4000），非醫療處方上限；
  // 是否超出該貓實際醫囑量（CatProfile.subQFluidPrescribedMl）由應用層另行比對並提示，不在此硬擋。
  subQFluidMl: z.number().min(0).max(600, '單次輸液量超出安全防呆上限 (600ml)').default(0),
  waterIntakeMl: z.number().min(0).max(1000, '飲水量超出合理範圍').default(0),
  appetiteLevel: z.enum(['GREAT', 'NORMAL', 'POOR', 'FORCE_FEED']).default('NORMAL'),
  vomitCount: z.number().int().min(0).max(20).default(0),
  notes: z.string().max(100, '備註上限 100 字').optional(),
  createdAt: z.string().datetime().optional()
})

// ==========================================
// 3. 生化血檢指標 Schema (IRIS 核心)
// 注意：所有數值需以下方標示單位輸入（mg/dL、ug/dL、%）；
// 若醫院報告使用其他單位制（例如 SI 制 umol/L），需自行換算後填入，
// 本版不做單位偵測與自動換算，未來如需支援請在 schema 補充 unit 欄位。
// ==========================================
export const BloodTestSchema = z.object({
  id: z.string().uuid().optional(),
  petId: z.string().uuid(),
  testDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式必須為 YYYY-MM-DD')
    .refine(isValidCalendarDate, '請輸入實際存在的日期'),
  hospitalName: z.string().max(30).optional(),
  bun: z.number().min(0).max(300, '數值超出檢驗合理範圍').describe('尿素氮 (mg/dL)'),
  creatinine: z.number().min(0).max(30, '數值超出檢驗合理範圍').describe('肌酸酐 (mg/dL)'),
  sdma: z.number().min(0).max(100).optional().describe('早期腎指標 (ug/dL)'),
  phosphorus: z.number().min(0).max(30, '數值超出檢驗合理範圍').describe('血磷 (mg/dL)'),
  hct: z.number().min(0).max(70).optional().describe('紅血球容積比 (%)'),
  notes: z.string().max(100).optional(),
  createdAt: z.string().datetime().optional()
})

// ==========================================
// 4. 照護者協作 Schema（永久免費功能，不綁定訂閱，見 docs/05-decisions/ADR-002-subscription-tier-model.md 的 Update）
// 只記錄「被邀請的協作者」，不記錄 owner 自己——owner 的權限來自 CatProfile.ownerId，
// 詳見 docs/02-data-contract/pet-caregiver.md
// ==========================================
export const PetCaregiverSchema = z.object({
  id: z.string().uuid().optional(),
  petId: z.string().uuid(),
  userId: z.string().uuid(), // 綁定 Supabase auth.users.id，被邀請的協作者帳號
  status: z.enum(['PENDING', 'ACCEPTED']).default('PENDING'),
  invitedEmail: z.string().email(),
  invitedAt: z.string().datetime().optional(),
  acceptedAt: z.string().datetime().optional()
})

// 每隻貓最多可協作的「總人數」，owner 本人已經算在這個數字裡面（不是 owner 另外 +3）。
// 例如 = 3 代表最多「owner + 2 位協作者」共 3 人，不是「owner + 3 位協作者」共 4 人。
// 累積口碑階段先固定為常數，之後如需依方案分級再改為讀取訂閱方案設定，不要一開始就過度設計
export const MAX_CAREGIVERS_PER_PET = 3

// ==========================================
// 5. 主動提醒排程 Schema（訂閱 Pro 進階功能）
// ==========================================
export const ReminderScheduleSchema = z.object({
  id: z.string().uuid().optional(),
  petId: z.string().uuid(),
  type: z.enum(['FLUID', 'MEDICATION', 'DAILY_LOG']),
  label: z.string().min(1, '請輸入提醒名稱').max(20),
  // 本地時間 HH:mm，MVP 只支援 Asia/Taipei 單一時區
  timeOfDay: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, '時間格式必須為 HH:mm'),
  enabled: z.boolean().default(true),
  createdAt: z.string().datetime().optional()
})

// ==========================================
// 6. 瀏覽器推播訂閱 Schema（Web Push，訂閱 Pro 進階功能）
// 純粹是「這個使用者的這個裝置」的憑證，不透過 cat_profiles/pet_caregivers 判斷任何權限
// ==========================================
export const PushSubscriptionSchema = z.object({
  id: z.string().uuid().optional(),
  userId: z.string().uuid(),
  endpoint: z.string().url(),
  p256dh: z.string().min(1),
  auth: z.string().min(1),
  createdAt: z.string().datetime().optional()
})

export type CatProfile = z.infer<typeof CatProfileSchema>
export type DailyCareLog = z.infer<typeof DailyCareLogSchema>
export type BloodTest = z.infer<typeof BloodTestSchema>
export type PetCaregiver = z.infer<typeof PetCaregiverSchema>
export type ReminderSchedule = z.infer<typeof ReminderScheduleSchema>
export type PushSubscriptionRecord = z.infer<typeof PushSubscriptionSchema>
