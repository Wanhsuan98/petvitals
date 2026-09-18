# 後端架構 (Supabase / RLS / 金流 / 推播)

Status: Living document
Last Updated: v1.2.0

## Supabase 與 RLS（現行，v1.0）

- 認證：Supabase Auth（Magic Link + Google OAuth），透過 `proxy.ts`（Next.js 16 把 `middleware.ts` 改名為 `proxy.ts`）在每個 request 刷新 session 並依登入狀態導向。
- 資料表：`cat_profiles`、`daily_care_logs`、`blood_tests`、`subscriptions`。
- RLS 模型：`cat_profiles.owner_id = auth.uid()`；`daily_care_logs`/`blood_tests` 透過 EXISTS 子查詢比對 `cat_profiles.owner_id = auth.uid()`。目前只認得單一 owner，不認得協作者。
- **重要維運提醒**：這個專案裡透過 SQL Editor 建立的資料表，不會自動繼承預設的 GRANT 權限。每張新表都要記得補上明確的 `grant ... to <role>` 給每個會用到它的角色（`authenticated`、`service_role`），否則會出現 `permission denied for table X` 這類 runtime 才會發現的錯誤。這是本專案已經踩過至少三次的坑（`cat_profiles`/`daily_care_logs`/`blood_tests`、`subscriptions` 對 `authenticated`、`subscriptions` 對 `service_role`）。

## RLS 模型變更（規劃中，v1.2：多照護者協作）

開放協作者後，`daily_care_logs`/`blood_tests` 的政策需要新增「你是這隻貓的 accepted caregiver」條件，用 `or` 連接既有的 owner 條件：

```sql
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
```

角色邊界：

- **owner**：唯一能管理訂閱（訂閱/取消）、邀請或移除協作者、刪除貓咪檔案的角色。
- **caregiver**：可讀寫 `daily_care_logs` / `blood_tests`，但不能觸及 `subscriptions` 或 `pet_caregivers` 表（RLS 只開放 owner 寫入這兩張表）。
- 人數上限（`MAX_CAREGIVERS_PER_PET = 3`，含 owner）在應用層檢查，邀請時若已達上限直接擋下，不需要 DB constraint。

詳細需求見 [../01-requirements/caregivers.md](../01-requirements/caregivers.md)，決策脈絡見 [../05-decisions/ADR-003-caregiver-cap.md](../05-decisions/ADR-003-caregiver-cap.md)。

## 金流：綠界 ECPay 定期定額訂閱（現行，v1.0）

- CheckMacValue 簽章（SHA256 + ECPay 專用 URL encode 規則），已用官方測試向量驗證過實作正確性。
- `ReturnURL`（伺服器對伺服器，需回 `1|OK`）、`PeriodReturnURL`（第 2 期起扣款通知）、`OrderResultURL`（瀏覽器導回頁面，注意跟 `ClientBackURL` 不同，且要用 `request.nextUrl.origin` 而非 `Origin` header，因為這是跨站 POST）。
- 備援機制：`QueryCreditCardPeriodInfo` 手動查詢 API，因為 webhook 不保證一定送達（目前仍觀察到需要手動觸發查詢才會更新狀態的情況，根因尚未完全確認）。

## 主動提醒推播的基礎設施（規劃中，v1.2）

- 需要一組 VAPID 金鑰對（`web-push` 套件產生），公鑰給前端訂閱用、私鑰僅存在伺服器端環境變數。
- 排程觸發目前規劃用 Vercel Cron 打 `api/cron/send-reminders`。**Vercel Cron 的執行頻率上限依方案而異，需要在真正動工前先查證目前方案是否能達到需要的排程精細度（例如每 5–15 分鐘一次）**——這點目前沒有查證，不要假設現有方案一定支援，先確認再排入開發排程。
- iOS Safari 對 Web Push 有平台限制（需 iOS 16.4+，且僅限已加入主畫面的 PWA），需在提醒設定頁明確告知使用者裝置相容性。

詳細需求見 [../01-requirements/notification.md](../01-requirements/notification.md)。
