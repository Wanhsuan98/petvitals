# PetVitals (CKD 貓慢性腎病專用版) — 產品規格與工程契約 (Lean Spec v1.1)

## 一、 專案核心摘要 (Executive Summary)

- **產品定位：** 專為確診慢性腎衰竭（IRIS 1–4期）家貓設計的「居家時序照護防呆 × 回診決策數據管家」PWA。
- **核心價值：** 透過極簡打卡解決輸液/飲水計算負擔、消除用藥時序衝突、即時繪製生化指數關聯圖表，並產出一鍵回診 A4 PDF 報告。
- **技術架構：** Next.js 16 (App Router) + Tailwind CSS v4 + Shadcn UI + Zod Runtime 防禦 + TanStack Query + Supabase (PostgreSQL)。

---

## 二、 核心使用者旅程 (Golden Path)

```
[每日居家 (10秒)] ──► 打開 PWA ──► 輸入輸液量(ml) / 飲水量(ml) / 體重(kg) ──► 檢查輸液/飲水達成度
│
[看診歸檔 (30秒)] ──► 點擊新增血檢 ──► 輸入 BUN / Crea / SDMA / P / HCT ──────► 自動比對已設定 IRIS 分期之血磷警示
│
[回診溝通 (3秒)]  ──► 點擊「匯出回診摘要」 ─────────────────────────────────► 產出標準 A4 橫式醫療報告 PDF
```

---

## 三、 範疇控制清單 (Scope Boundaries)

### ✅ MVP 必做範疇 (In Scope)

1. **PWA 跨平台安裝：** 支援 Web App Manifest、Service Worker 離線快取基礎表單與圖表（僅支援離線瀏覽歷史資料，打卡寫入需連網，不做背景同步佇列）。
2. **每日照護日誌 (DailyCareLog)：**
   - 皮下輸液量記錄（內建防手滑上限驗證，並與該貓醫囑單次量比對，超出時提示但不擋存檔）。
   - 飲水達成度（飲水量 ÷ 每日飲水目標）與輸液達成度（輸液量 ÷ 醫囑單次量 × 每日次數）分開呈現，不合併為單一總水分進度條。
   - 體重記錄與近 7 天下滑趨勢計算（窗口內最高點 vs 最新值）。
   - 同一天可有多筆記錄（含精確打卡時間），支援一天多次輸液的情境。
3. **生化血檢管理 (BloodTest)：**
   - 支援 5 項核心指標記錄：BUN、Creatinine、SDMA、Phosphorus (P)、HCT。
   - 使用者依獸醫診斷結果手動設定/更新 IRIS 分期，系統依所選分期自動比對對應血磷控制上限並提示（非系統自動診斷判定）。
4. **多維度視覺化儀表板：**
   - 運用 Chart.js 呈現「體重 vs 輸液量」及「BUN/Crea vs 血磷」多軸時間序列曲線。
5. **回診專用 A4 PDF 輸出：**
   - 純前端 CSS Print 佈局排版，單頁 A4 橫式摘要呈現。

### ❌ 第一版排除範疇 (Out of Scope)

- ❌ 社群動態牆、留言互動與寵物相簿。
- ❌ 多帳號共享與多寵物切換（MVP 僅限單一使用者綁定單隻貓）。
- ❌ 雙平台 Native 原生 App 開發與上架。
- ❌ 醫院端院務系統 (PIMS) 雙向 API 對接。
- ❌ 複雜原生推播通知（僅提供 Web Push API 瀏覽器推播提醒；LINE Notify 已於 2025/3/31 停止服務，不再採用，未來如需 LINE 整合須改走 LINE Messaging API 官方帳號，需另行申請與審核）。
- ❌ PWA 離線寫入背景同步（Background Sync／IndexedDB 佇列排到 v2，MVP 離線時僅能瀏覽快取內容，無法離線打卡）。

---

## 四、 核心資料契約 (Zod Schemas)

```typescript
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
```

---

## 五、 系統架構與路由設計 (Next.js 16 App Router)

```
app/
├── (auth)/
│   ├── login/page.tsx               # Magic Link / Google 登入
│   └── layout.tsx
├── (dashboard)/                     # PWA 應用核心
│   ├── layout.tsx                   # 底部手機導航列 (Tab Bar: 首頁 / 打卡 / 報告 / 設定)
│   ├── page.tsx                     # 總覽首頁：今日輸液/飲水達成度 + 今日狀態卡 + 7天體重趨勢
│   ├── log/
│   │   └── page.tsx                 # 每日 10 秒極速輸入表單 (React Hook Form + Zod)
│   ├── records/
│   │   ├── page.tsx                 # 歷史血檢清單 + Chart.js 多維度趨勢圖
│   │   └── new/page.tsx             # 新增血檢報告表單
│   └── settings/
│       └── page.tsx                 # 貓咪基本資料、目標水量與醫囑設定
└── (export)/
    └── report/
        └── [petId]/page.tsx         # 獸醫回診專用 A4 摘要報告頁 (CSS Print 專用佈局)
```

---

## 六、 臨床輔助與警戒演算法邏輯

```typescript
// 1. 體重急遽下降警報（預設近 7 天內，窗口內最高點 vs 最新值下滑 >= 3%）
// 日期窗口篩選在函式內處理，呼叫端可直接傳入完整歷史 logs，不需自行先過濾，避免隱性契約造成誤用
export function checkWeightLossAlert(
  logs: DailyCareLog[],
  windowDays: number = 7
): { isAlert: boolean; dropRate: number } {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - windowDays)

  const recent = [...logs]
    .filter((log) => typeof log.weightKg === 'number' && new Date(log.date) >= cutoff)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  if (recent.length < 2) return { isAlert: false, dropRate: 0 }

  const maxWeight = Math.max(...recent.map((log) => log.weightKg!))
  const latest = recent[recent.length - 1].weightKg!

  const dropRate = ((maxWeight - latest) / maxWeight) * 100
  return {
    isAlert: dropRate >= 3.0,
    dropRate: Number(dropRate.toFixed(1))
  }
}

// 2. IRIS 各期血磷控制標準比對（irisStage 為使用者依獸醫診斷手動設定值，非系統診斷判定）
// 血磷控制上限整理自 IRIS (International Renal Interest Society) 分期照護建議，僅供參考，
// 實際數值可能隨指引版本更新而調整，正式引用前請與獸醫師核對當前版本的臨床指引。
export function evaluatePhosphorusStatus(
  stage: CatProfile['irisStage'],
  pValue: number
): {
  isHigh: boolean
  targetMax: number
  message: string
} {
  const thresholdMap: Record<CatProfile['irisStage'], number> = {
    STAGE_1: 4.5,
    STAGE_2: 4.5,
    STAGE_3: 5.0,
    STAGE_4: 6.0
  }

  const targetMax = thresholdMap[stage]
  const isHigh = pValue > targetMax

  return {
    isHigh,
    targetMax,
    message: isHigh
      ? `當前血磷 (${pValue} mg/dL) 已高於 IRIS ${stage} 期建議上限 (${targetMax} mg/dL)，請諮詢獸醫師是否調整降磷策略。（本標準依 IRIS 分期照護建議整理，僅供參考）`
      : `血磷控制良好，符合 IRIS ${stage} 期目標 (< ${targetMax} mg/dL)。（本標準依 IRIS 分期照護建議整理，僅供參考）`
  }
}

// 3. 單次輸液量軟性比對（超出醫囑量僅提示，不擋存檔——防呆上限與醫療處方上限分離）
export function checkFluidOverPrescribed(
  subQFluidMl: number,
  prescribedMl: number
): {
  isOverPrescribed: boolean
  message: string | null
} {
  const isOverPrescribed = subQFluidMl > prescribedMl
  return {
    isOverPrescribed,
    message: isOverPrescribed
      ? `本次記錄 (${subQFluidMl}ml) 超出醫囑單次量 (${prescribedMl}ml)，請確認是否手誤或已與獸醫師確認調整。`
      : null
  }
}

// 4. 當日輸液與飲水達成度（分開計算，不合併為單一總水分進度條）
export function calculateDailyProgress(
  todayLogs: DailyCareLog[],
  cat: Pick<CatProfile, 'subQFluidPrescribedMl' | 'subQFluidFrequencyPerDay' | 'dailyFluidTargetMl'>
): { fluidProgressPercent: number; waterProgressPercent: number } {
  const totalFluidMl = todayLogs.reduce((sum, log) => sum + log.subQFluidMl, 0)
  const totalWaterMl = todayLogs.reduce((sum, log) => sum + log.waterIntakeMl, 0)

  const fluidTarget = cat.subQFluidPrescribedMl * cat.subQFluidFrequencyPerDay

  return {
    fluidProgressPercent:
      fluidTarget > 0 ? Math.min(100, Math.round((totalFluidMl / fluidTarget) * 100)) : 0,
    waterProgressPercent: Math.min(100, Math.round((totalWaterMl / cat.dailyFluidTargetMl) * 100))
  }
}
```

---

## 七、 法律免責條款 (Medical Disclaimer)

**免責聲明：** 本系統（PetVitals）僅作為飼主居家健康數據記錄、歷史趨勢可視化與日常照護之輔助工具，不具備獸醫臨床診斷功能，亦不構成任何醫療處方與治療建議。系統提供之 IRIS 分期標準與警戒提示僅供參考，毛孩之確切病情、輸液劑量與處方用藥，請務必遵循執業獸醫師之醫囑與指導。

---

## 八、 4 週極限精實交付時程 (Milestones)

| 階段       | 週期                     | 核心交付成果與驗收標準                                                                                                                                     |
| :--------- | :----------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Week 1** | 基礎架構與極速打卡       | 完成 Next.js 16 + Tailwind v4 + PWA 設定；交付 DailyCareLog 表單與 Zod 驗證邏輯；同步送出綠界個人會員金流申請（審核為外部流程，提早送出以免卡在 Week 4）。 |
| **Week 2** | 血檢指標與多軸圖表       | 實作血檢記錄模組；整合 Chart.js 雙軸圖表與 IRIS 血磷/體重警報演算法。                                                                                      |
| **Week 3** | Supabase 串接與 PDF 列印 | 完成 Supabase Auth/DB 串接；實作 `(export)/report` 專用 A4 橫式列印佈局與 Vitest 契約測試。                                                                |
| **Week 4** | 部署上線與社群種子驗證   | 部署至 Vercel；於 FB 腎貓社團招募 20 位內測家長；串接綠界 (ECPay) 定期定額訂閱金流（NT$ 199/月，個人會員身分，月收款額度 NT$30萬）。                       |
