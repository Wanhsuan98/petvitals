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

export type CatProfile = z.infer<typeof CatProfileSchema>
export type DailyCareLog = z.infer<typeof DailyCareLogSchema>
export type BloodTest = z.infer<typeof BloodTestSchema>
